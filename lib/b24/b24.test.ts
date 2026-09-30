import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { B24Error, createB24Client, parseB24Response } from './client'
import { enqueueB24Sync, registerB24Handler, retryB24Sync, runB24Sync } from './sync'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
const WEBHOOK = 'https://zevs.bitrix24.ru/rest/1/SECRET/'

function fakePayload(docs: Record<string, Record<string, unknown>>, opts: { queue?: () => Promise<unknown> } = {}) {
  const queued: unknown[] = []
  const payload = {
    findByID: async ({ collection, id }: { collection: string; id: string | number }) => docs[`${collection}/${id}`] ?? null,
    update: async ({ collection, id, data }: { collection: string; id: string | number; data: Record<string, unknown> }) =>
      Object.assign(docs[`${collection}/${id}`], data),
    logger: { info: () => undefined, error: () => undefined },
    jobs: { queue: opts.queue ?? (async (args: unknown) => queued.push(args)) },
  }
  return { payload: payload as unknown as Payload, queued }
}

describe('parseB24Response', () => {
  const kind = (status: number, body: unknown) => {
    try {
      parseB24Response(status, body as never)
      return 'ok'
    } catch (e) {
      return (e as B24Error).retryable ? 'retry' : 'permanent'
    }
  }
  it('классифицирует ответы', () => {
    expect(kind(200, { result: 5 })).toBe('ok')
    expect(kind(503, null)).toBe('retry')
    expect(kind(500, { error: 'X' })).toBe('retry')
    expect(kind(429, null)).toBe('retry')
    expect(kind(200, { error: 'QUERY_LIMIT_EXCEEDED' })).toBe('retry')
    expect(kind(200, null)).toBe('retry')
    expect(kind(400, { error: 'ERROR_CORE', error_description: 'bad field' })).toBe('permanent')
    expect(kind(401, { error: 'INVALID_CREDENTIALS' })).toBe('permanent')
    expect(kind(404, null)).toBe('permanent')
  })
})

describe('createB24Client', () => {
  afterEach(() => vi.useRealTimers())

  it('выключен без URL — понятная ошибка без сети', async () => {
    const f = vi.fn()
    const c = createB24Client({ webhookUrl: '', fetch: f })
    expect(c.enabled).toBe(false)
    await expect(c.call('crm.deal.add')).rejects.toMatchObject({ code: 'DISABLED', retryable: false })
    expect(f).not.toHaveBeenCalled()
  })

  it('POST на метод вебхука, результат из result', async () => {
    const f = vi.fn(async () => json(200, { result: 42 }))
    const c = createB24Client({ webhookUrl: WEBHOOK, fetch: f, minIntervalMs: 0 })
    expect(await c.call<number>('crm.deal.add', { fields: { TITLE: 'x' } })).toBe(42)
    expect(f).toHaveBeenCalledWith('https://zevs.bitrix24.ru/rest/1/SECRET/crm.deal.add.json', expect.objectContaining({ method: 'POST' }))
  })

  it('сетевая ошибка — retryable, секрет вебхука не утекает в сообщение', async () => {
    const c = createB24Client({ webhookUrl: WEBHOOK, fetch: async () => Promise.reject(new TypeError(`fetch failed ${WEBHOOK}`)), minIntervalMs: 0 })
    const err = (await c.call('crm.deal.add').catch((e) => e)) as B24Error
    expect(err).toMatchObject({ code: 'NETWORK', retryable: true })
    expect(err.message).not.toContain('SECRET')
  })

  it('троттлинг: не чаще раза в minIntervalMs', async () => {
    vi.useFakeTimers({ now: 0 })
    const at: number[] = []
    const c = createB24Client({ webhookUrl: WEBHOOK, fetch: async () => (at.push(Date.now()), json(200, { result: 1 })), minIntervalMs: 500 })
    const all = Promise.all([c.call('a'), c.call('b'), c.call('c')])
    await vi.advanceTimersByTimeAsync(2000)
    await all
    expect(at).toEqual([0, 500, 1000])
  })
})

describe('runB24Sync', () => {
  // исполнитель сделки для теста — как его подключит I-B24-DEAL
  registerB24Handler('order', async ({ doc, b24 }) => b24.call<number>('crm.deal.add', { fields: { TITLE: doc.number } }))

  it('Б24 недоступна → повторы → доставка после восстановления, syncError очищен', async () => {
    const docs = { 'orders/1': { id: 1, number: 'ZP-2026-0001' } as Record<string, unknown> }
    const { payload } = fakePayload(docs)
    const responses = [() => Promise.reject(new TypeError('ECONNREFUSED')), async () => json(503, null), async () => json(200, { result: 777 })]
    const f = vi.fn(async () => responses.shift()!())
    const b24 = createB24Client({ webhookUrl: WEBHOOK, fetch: f, minIntervalMs: 0 })

    // так Payload Jobs гоняет задачу: бросила retryable — повтор по backoff
    const attempts: string[] = []
    for (let i = 0; i < 9; i++) {
      try {
        const r = await runB24Sync({ kind: 'order', id: 1, payload, b24 })
        attempts.push(r.status)
        break
      } catch (e) {
        expect((e as B24Error).retryable).toBe(true)
        attempts.push('retry')
        expect(docs['orders/1'].syncError).toMatch(/повтор по расписанию/)
      }
    }
    expect(attempts).toEqual(['retry', 'retry', 'sent'])
    expect(docs['orders/1']).toMatchObject({ b24DealId: '777', syncError: null })
  })

  it('повторная доставка job с b24-id не создаёт дубль', async () => {
    const docs = { 'orders/2': { id: 2, number: 'ZP-2', b24DealId: '555' } }
    const f = vi.fn()
    const r = await runB24Sync({ kind: 'order', id: 2, payload: fakePayload(docs).payload, b24: createB24Client({ webhookUrl: WEBHOOK, fetch: f }) })
    expect(r).toEqual({ status: 'already', b24Id: '555' })
    expect(f).not.toHaveBeenCalled()
  })

  it('400/авторизация — permanent + syncError', async () => {
    const docs = { 'orders/3': { id: 3, number: 'ZP-3' } as Record<string, unknown> }
    const b24 = createB24Client({ webhookUrl: WEBHOOK, fetch: async () => json(401, { error: 'INVALID_CREDENTIALS', error_description: 'Invalid request credentials' }), minIntervalMs: 0 })
    await expect(runB24Sync({ kind: 'order', id: 3, payload: fakePayload(docs).payload, b24 })).rejects.toMatchObject({ retryable: false })
    expect(docs['orders/3'].syncError).toBe('Б24 INVALID_CREDENTIALS: Invalid request credentials')
    expect(docs['orders/3'].b24DealId).toBeUndefined()
  })

  it('выключенный клиент — permanent, заказ помечен syncError', async () => {
    const docs = { 'orders/4': { id: 4, number: 'ZP-4' } as Record<string, unknown> }
    await expect(runB24Sync({ kind: 'order', id: 4, payload: fakePayload(docs).payload, b24: createB24Client() })).rejects.toMatchObject({ code: 'DISABLED' })
    expect(docs['orders/4'].syncError).toMatch(/B24_WEBHOOK_URL/)
  })

  it('документ ещё не виден (не закоммичен) — retryable', async () => {
    await expect(runB24Sync({ kind: 'order', id: 9, payload: fakePayload({}).payload, b24: createB24Client() })).rejects.toMatchObject({ code: 'NOT_FOUND', retryable: true })
  })

  it('без исполнителя — пропуск без syncError', async () => {
    const docs = { 'customers/1': { id: 1 } as Record<string, unknown> }
    expect(await runB24Sync({ kind: 'company', id: 1, payload: fakePayload(docs).payload, b24: createB24Client() })).toEqual({ status: 'skipped' })
    expect(docs['customers/1'].syncError).toBeUndefined()
  })
})

describe('enqueueB24Sync / retryB24Sync', () => {
  it('сбой постановки не бросает, пишет syncError', async () => {
    const docs = { 'orders/5': { id: 5 } as Record<string, unknown> }
    const { payload } = fakePayload(docs, { queue: () => Promise.reject(new Error('db down')) })
    expect(await enqueueB24Sync(payload, 'order', 5)).toBe(false)
    expect(docs['orders/5'].syncError).toMatch(/отправьте повторно/)
  })

  it('ручной повтор: при b24-id ничего не ставит, иначе ставит job', async () => {
    const { payload, queued } = fakePayload({ 'orders/6': { id: 6, b24DealId: '1' }, 'orders/7': { id: 7 } })
    expect(await retryB24Sync(payload, 'order', 6)).toEqual({ status: 'already', b24Id: '1' })
    expect(await retryB24Sync(payload, 'order', 7)).toEqual({ status: 'queued' })
    expect(await retryB24Sync(payload, 'order', 8)).toEqual({ status: 'not_found' })
    expect(queued).toEqual([{ task: 'b24-sync', input: { kind: 'order', id: '7' } }])
  })
})
