import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { createB24Client } from './client'
import { handleB24DealWebhook, mapStage, parseB24Event, tokenMatches, type B24StageMap } from './status'
import { nextStatusHistory } from '@/payload/hooks/orders'

const WEBHOOK = 'https://zevs.bitrix24.ru/rest/1/SECRET/'
const TOKEN = 'app-token-123'
type Doc = Record<string, unknown>

/** Портал: сделки по ID для crm.deal.get; down — сеть недоступна. */
function fakePortal(deals: Record<string, Doc>, opts: { down?: boolean } = {}) {
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    if (opts.down) return new Response('', { status: 503 })
    const method = url.slice(WEBHOOK.length).replace(/\.json$/, '')
    const { id } = JSON.parse(String(init?.body)) as { id: string }
    const deal = method === 'crm.deal.get' ? deals[id] : undefined
    return deal
      ? new Response(JSON.stringify({ result: deal }), { status: 200 })
      : new Response(JSON.stringify({ error: 'NOT_FOUND', error_description: 'Not found' }), { status: 400 })
  })
  return { b24: createB24Client({ webhookUrl: WEBHOOK, fetch: f as unknown as typeof fetch, minIntervalMs: 0 }), f }
}

/** Заказы в памяти; update повторяет beforeChange заказа (история статусов с примечанием из context). */
function fakePayload(orders: Doc[], stageMap: B24StageMap) {
  const updates: Doc[] = []
  const payload = {
    find: async ({ where }: { where: Record<string, { equals: unknown }> }) => {
      const [field, { equals }] = Object.entries(where)[0]
      return { docs: orders.filter((o) => o[field] === equals).slice(0, 1) }
    },
    findGlobal: async () => ({ b24StageMap: stageMap }),
    update: async ({ id, data, context }: { id: unknown; data: Doc; context?: { statusNote?: string } }) => {
      updates.push(data)
      const o = orders.find((x) => x.id === id)!
      if (data.status)
        data.statusHistory = nextStatusHistory(o.statusHistory as never, o.status as string, data.status as string, '2026-09-30T10:00:00.000Z', context?.statusNote)
      return Object.assign(o, data)
    },
    logger: { info: vi.fn(), error: vi.fn() },
  }
  return { payload: payload as unknown as Payload, updates }
}

const MAP: B24StageMap = [
  { stage: 'C1:PREPARATION', status: 'picking' },
  { stage: 'C1:WON', status: 'delivered', paymentStatus: 'paid' },
]
const form = (id: string, token = TOKEN, event = 'ONCRMDEALUPDATE') =>
  new URLSearchParams({ event, 'data[FIELDS][ID]': id, 'auth[application_token]': token, 'auth[domain]': 'zevs.bitrix24.ru' }).toString()
const FORM = 'application/x-www-form-urlencoded'

function setup(stage: string, orderOver: Doc = {}, portalOpts: { down?: boolean } = {}) {
  const order: Doc = { id: 1, number: 'ZP-2026-0007', b24DealId: '42', status: 'accepted', paymentStatus: 'pending', statusHistory: [{ at: 'x', status: 'accepted' }], ...orderOver }
  const portal = fakePortal({ '42': { ID: '42', STAGE_ID: stage, ORIGINATOR_ID: 'zevsprotect.ru', ORIGIN_ID: 'ZP-2026-0007' } }, portalOpts)
  const p = fakePayload([order], MAP)
  const run = (raw = form('42'), contentType: string | null = FORM, expectedToken: string | undefined = TOKEN) =>
    handleB24DealWebhook({ contentType, raw, expectedToken, payload: p.payload, b24: portal.b24 })
  return { order, run, ...portal, ...p }
}

describe('разбор тела и токен', () => {
  it('form-urlencoded и JSON (вложенный и плоский)', () => {
    const want = { event: 'ONCRMDEALUPDATE', dealId: '42', token: TOKEN }
    expect(parseB24Event(FORM, form('42'))).toEqual(want)
    expect(parseB24Event('application/json', JSON.stringify({ event: 'onCrmDealUpdate', data: { FIELDS: { ID: 42 } }, auth: { application_token: TOKEN } }))).toEqual(want)
    expect(parseB24Event('application/json', JSON.stringify({ event: 'ONCRMDEALUPDATE', 'data[FIELDS][ID]': '42', 'auth[application_token]': TOKEN }))).toEqual(want)
    expect(parseB24Event('application/json', '{broken')).toEqual({})
  })
  it('токен: пустой ожидаемый/пришедший не совпадает', () => {
    expect(tokenMatches(TOKEN, TOKEN)).toBe(true)
    expect(tokenMatches(TOKEN, TOKEN + 'x')).toBe(false)
    expect(tokenMatches('', '')).toBe(false)
    expect(tokenMatches(undefined, TOKEN)).toBe(false)
    expect(tokenMatches(TOKEN, undefined)).toBe(false)
  })
  it('маппинг: без таблицы — ничего (стадии не выдуманы)', () => {
    expect(mapStage(undefined, 'C1:WON')).toBeUndefined()
    expect(mapStage([], 'WON')).toBeUndefined()
    expect(mapStage(MAP, 'C1:WON')).toEqual({ status: 'delivered', paymentStatus: 'paid' })
    expect(mapStage(MAP, 'C1:PREPARATION')).toEqual({ status: 'picking' })
  })
})

describe('вебхук ONCRMDEALUPDATE (I-B24-ST)', () => {
  it('смена стадии → статус, оплата и запись в истории с источником', async () => {
    const t = setup('C1:WON')
    expect(await t.run()).toEqual({ status: 200, body: { result: 'updated' } })
    expect(t.order).toMatchObject({ status: 'delivered', paymentStatus: 'paid' })
    expect(t.order.statusHistory).toEqual([{ at: 'x', status: 'accepted' }, { at: '2026-09-30T10:00:00.000Z', status: 'delivered', note: 'Битрикс24' }])
    expect(t.f.mock.calls[0][0]).toBe(`${WEBHOOK}crm.deal.get.json`)
  })

  it('повтор того же события идемпотентен — без записи', async () => {
    const t = setup('C1:PREPARATION')
    await t.run()
    expect((await t.run()).body.result).toBe('unchanged')
    expect(t.updates).toHaveLength(1)
    expect(t.order.statusHistory).toHaveLength(2)
  })

  it('стадия берётся из crm.deal.get, не из тела: «старый» вебхук не откатывает статус', async () => {
    const t = setup('C1:WON', { status: 'delivered', paymentStatus: 'paid' })
    const raw = form('42') + '&data[FIELDS][STAGE_ID]=C1:PREPARATION'
    expect((await t.run(raw)).body.result).toBe('unchanged')
    expect(t.order.status).toBe('delivered')
  })

  it('неизвестная стадия — 200, заказ не меняется, syncError не пишется', async () => {
    const t = setup('C1:UNKNOWN')
    expect(await t.run()).toEqual({ status: 200, body: { result: 'unmapped' } })
    expect(t.updates).toEqual([])
    expect(t.order).not.toHaveProperty('syncError')
  })

  it('неверный/нет токена → 401 без обращения к Б24; токен не настроен → 503', async () => {
    const t = setup('C1:WON')
    expect((await t.run(form('42', 'wrong'))).status).toBe(401)
    expect((await t.run(new URLSearchParams({ event: 'ONCRMDEALUPDATE', 'data[FIELDS][ID]': '42' }).toString())).status).toBe(401)
    expect((await t.run(form('42', ''), FORM, '')).status).toBe(503)
    const unset = await handleB24DealWebhook({ contentType: FORM, raw: form('42'), expectedToken: undefined, payload: t.payload, b24: t.b24 })
    expect(unset.status).toBe(503)
    expect(t.f).not.toHaveBeenCalled()
    expect(t.order.status).toBe('accepted')
  })

  it('заказ не найден → 200; поиск по ORIGIN_ID, если b24DealId не сохранён', async () => {
    const other = setup('C1:WON', { b24DealId: null, number: 'ZP-OTHER' })
    expect((await other.run()).body.result).toBe('not_found')
    const byNumber = setup('C1:WON', { b24DealId: null })
    expect((await byNumber.run()).body.result).toBe('updated')
    const foreign = setup('C1:WON', { b24DealId: '99' }) // у заказа другая сделка — не трогаем
    expect((await foreign.run()).body.result).toBe('not_found')
  })

  it('Б24 недоступна при crm.deal.get → 503 (Б24 повторит); сделка удалена → 200', async () => {
    const t = setup('C1:WON', {}, { down: true })
    expect((await t.run()).status).toBe(503)
    expect(t.order.status).toBe('accepted')
    const gone = setup('C1:WON')
    expect((await gone.run(form('77'))).body.result).toBe('ignored')
  })

  it('другое событие — 200 ignored без Б24; без ID — 400', async () => {
    const t = setup('C1:WON')
    expect((await t.run(form('42', TOKEN, 'ONCRMDEALADD'))).body.result).toBe('ignored')
    expect((await t.run(form(''))).status).toBe(400)
    expect(t.f).not.toHaveBeenCalled()
  })
})
