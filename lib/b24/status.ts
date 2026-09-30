import { createHash, timingSafeEqual } from 'node:crypto'
import type { Payload } from 'payload'
import type { Order, Setting } from '@/payload/payload-types'
import { B24Error, type B24Client } from './client'
import { B24_ORIGINATOR } from './config'

// I-B24-ST: исходящий вебхук Б24 ONCRMDEALUPDATE → crm.deal.get → маппинг стадии → orders.status/paymentStatus.
// Из тела вебхука берём только event, ID сделки и application_token: стадию читаем из Б24 на момент обработки,
// поэтому поздний/повторный вебхук не откатит статус назад — get вернёт актуальную стадию.

export type B24StageMap = NonNullable<Setting['b24StageMap']>
type Mapped = { status: Order['status']; paymentStatus?: Order['paymentStatus'] }
export type B24Event = { event?: string; dealId?: string; token?: string }

/** Примечание в statusHistory при смене статуса из Б24 (читает beforeChange заказа из context). */
export const B24_STATUS_NOTE = 'Битрикс24'

const pick = (obj: unknown, path: string[]): unknown =>
  path.reduce<unknown>((o, k) => (o && typeof o === 'object' ? Reflect.get(o, k) : undefined), obj)
const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() || undefined : undefined)

/** Тело вебхука: Б24 шлёт form-urlencoded (`data[FIELDS][ID]=…`), поддерживаем и JSON (вложенный или с теми же ключами). */
export function parseB24Event(contentType: string | null, raw: string): B24Event {
  let get: (path: string[]) => unknown
  if ((contentType ?? '').includes('json')) {
    let body: unknown = null
    try {
      body = JSON.parse(raw)
    } catch {
      return {}
    }
    get = (path) => pick(body, path) ?? pick(body, [path[0] + path.slice(1).map((k) => `[${k}]`).join('')])
  } else {
    const form = new URLSearchParams(raw)
    get = (path) => form.get(path[0] + path.slice(1).map((k) => `[${k}]`).join('')) ?? undefined
  }
  return { event: str(get(['event']))?.toUpperCase(), dealId: str(get(['data', 'FIELDS', 'ID'])), token: str(get(['auth', 'application_token'])) }
}

/** Сравнение за постоянное время (хэши выравнивают длину). Пустой ожидаемый токен не совпадает ни с чем. */
export function tokenMatches(expected: string | undefined, got: string | undefined): boolean {
  if (!expected || !got) return false
  const h = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(h(expected), h(got))
}

/**
 * Стадия сделки → статус заказа по таблице из «Настройки». Стадии воронки заказчика неизвестны (BIZ-5),
 * поэтому соответствий по умолчанию нет: пустая таблица — статусы из Б24 не меняют заказ.
 */
export function mapStage(map: B24StageMap | null | undefined, stageId: string | undefined): Mapped | undefined {
  if (!stageId) return undefined
  const row = (map ?? []).find((r) => r.stage.trim() === stageId)
  return row ? { status: row.status, ...(row.paymentStatus ? { paymentStatus: row.paymentStatus } : {}) } : undefined
}

type Deal = { ID?: string | number; STAGE_ID?: string; ORIGIN_ID?: string; ORIGINATOR_ID?: string }
export type WebhookResult = { status: number; body: { result: string; message?: string } }
const reply = (status: number, result: string, message?: string): WebhookResult => ({ status, body: message ? { result, message } : { result } })

async function findOrder(payload: Payload, deal: Deal, dealId: string): Promise<Order | undefined> {
  const byDeal = await payload.find({ collection: 'orders', where: { b24DealId: { equals: dealId } }, limit: 1, depth: 0, overrideAccess: true })
  if (byDeal.docs[0]) return byDeal.docs[0]
  // ID сделки мог не успеть сохраниться в заказ — сделка с сайта несёт номер заказа в ORIGIN_ID
  if (deal.ORIGINATOR_ID !== B24_ORIGINATOR || !deal.ORIGIN_ID) return undefined
  const byNumber = await payload.find({ collection: 'orders', where: { number: { equals: deal.ORIGIN_ID } }, limit: 1, depth: 0, overrideAccess: true })
  const order = byNumber.docs[0]
  return order && (!order.b24DealId || order.b24DealId === dealId) ? order : undefined
}

/**
 * Обработка вебхука. Коды: 503 — вебхук не настроен или Б24 временно недоступна (Б24 повторит доставку);
 * 401 — чужой токен (в Б24 не ходим); 200 — обработано или осознанно пропущено (чтобы Б24 не ретраил бесконечно).
 */
export async function handleB24DealWebhook(args: {
  contentType: string | null
  raw: string
  expectedToken: string | undefined
  payload: Payload
  b24: B24Client
}): Promise<WebhookResult> {
  const { payload, b24 } = args
  if (!args.expectedToken?.trim()) return reply(503, 'disabled', 'Вебхук Б24 не настроен: не задан B24_WEBHOOK_TOKEN')
  const evt = parseB24Event(args.contentType, args.raw)
  if (!tokenMatches(args.expectedToken.trim(), evt.token)) return reply(401, 'unauthorized', 'Неверный токен')
  if (evt.event !== 'ONCRMDEALUPDATE') return reply(200, 'ignored', 'Событие не обрабатывается')
  if (!evt.dealId || !/^\d+$/.test(evt.dealId)) return reply(400, 'bad_request', 'Нет data[FIELDS][ID]')
  const dealId = evt.dealId

  let deal: Deal
  try {
    deal = (await b24.call<Deal>('crm.deal.get', { id: dealId })) ?? {}
  } catch (err) {
    const e = err instanceof B24Error ? err : new B24Error(err instanceof Error ? err.message : String(err), true)
    if (e.retryable || e.code === 'DISABLED') {
      payload.logger.error({ msg: `Б24 вебхук: crm.deal.get ${dealId} не выполнен: ${e.message}` })
      return reply(503, 'retry', 'Б24 недоступна, повторите доставку')
    }
    // сделка удалена/нет прав — повтор не поможет
    payload.logger.info({ msg: `Б24 вебхук: сделка ${dealId} не получена: ${e.message}` })
    return reply(200, 'ignored', 'Сделка не получена')
  }

  const order = await findOrder(payload, deal, dealId)
  if (!order) {
    payload.logger.info({ msg: `Б24 вебхук: заказ по сделке ${dealId} не найден` })
    return reply(200, 'not_found')
  }
  const mapped = mapStage(
    (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })).b24StageMap,
    str(deal.STAGE_ID),
  )
  if (!mapped) {
    payload.logger.info({ msg: `Б24 вебхук: стадия «${deal.STAGE_ID ?? ''}» сделки ${dealId} не сопоставлена статусу — заказ ${order.number} не изменён` })
    return reply(200, 'unmapped')
  }

  const data: Partial<Pick<Order, 'status' | 'paymentStatus'>> = {}
  if (mapped.status !== order.status) data.status = mapped.status
  if (mapped.paymentStatus && mapped.paymentStatus !== order.paymentStatus) data.paymentStatus = mapped.paymentStatus
  // повторная доставка той же стадии — без записи
  if (!Object.keys(data).length) return reply(200, 'unchanged')

  // частичный update: остальные поля заказа не трогаем; история статуса дописывается в beforeChange
  await payload.update({ collection: 'orders', id: order.id, data, depth: 0, overrideAccess: true, context: { statusNote: B24_STATUS_NOTE } })
  return reply(200, 'updated')
}
