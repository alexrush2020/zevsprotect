export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

type Line = { price?: number | null; qty?: number | null }

const safe = (n: number | null | undefined) => (Number.isFinite(n) && (n as number) > 0 ? (n as number) : 0)

export function computeTotal(items: Line[] | undefined, deliveryCost: number | null | undefined): number {
  const lines = (items ?? []).reduce((s, i) => s + round2(safe(i.price) * safe(i.qty)), 0)
  return round2(lines + safe(deliveryCost))
}

export const formatOrderNumber = (year: number, seq: number) =>
  `ZP-${year}-${String(seq).padStart(4, '0')}`

export type HistoryEntry = { at: string; status: string; note?: string }

export function nextStatusHistory(
  prev: HistoryEntry[] | undefined,
  prevStatus: string | undefined,
  status: string,
  nowIso: string,
  note?: string,
): HistoryEntry[] {
  const history = prev ?? []
  if (prevStatus === status && history.length) return history
  return [...history, note ? { at: nowIso, status, note } : { at: nowIso, status }]
}

export const hasCustomerOrGuest = (d: { customer?: unknown; guest?: { phone?: string; name?: string } }) =>
  Boolean(d.customer) || Boolean(d.guest?.phone)

/** Следующий порядковый номер по последнему номеру года; мусор/пусто → 1. */
export function nextOrderSeq(lastNumber: string | undefined): number {
  const m = /-(\d+)$/.exec(lastNumber ?? '')
  return m ? Number(m[1]) + 1 : 1
}

type WithDelivery = { delivery?: { cost?: number | null } | null }

/** Стоимость доставки: явно переданный ключ cost (в т.ч. null = очистка) главнее оригинала; частичный PATCH без ключа берёт из originalDoc. */
export function resolveDeliveryCost(data: WithDelivery, originalDoc?: WithDelivery): number | null | undefined {
  return data.delivery && 'cost' in data.delivery ? data.delivery.cost : originalDoc?.delivery?.cost
}

/** Поля заказа, попадающие в XML выгрузки в 1С (lib/onec/orders-export.ts); total выводится из items и delivery.cost. */
const ONEC_FIELDS = ['items', 'guest', 'delivery', 'paymentMethod', 'paymentStatus', 'status', 'comment', 'customer'] as const

/** Сравнимый вид: без id строк массивов, заполненная связь → id, null/'' = отсутствие, ключи по порядку. */
function canon(v: unknown): unknown {
  if (v === null || v === undefined || v === '') return undefined
  if (Array.isArray(v)) return v.map(canon)
  if (typeof v !== 'object') return v
  const o = v as Record<string, unknown>
  if ('createdAt' in o && 'id' in o) return o.id // документ связи (depth>0)
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(o).sort()) {
    const c = k === 'id' ? undefined : canon(o[k])
    if (c !== undefined) out[k] = c
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * Изменилось ли выгружаемое в 1С. data — входящие поля: отсутствующий ключ = без изменений (частичный PATCH);
 * группы guest/delivery при частичном PATCH сливаются с оригиналом, как в Payload.
 */
export function onecFieldsChanged(data: Record<string, unknown>, originalDoc: Record<string, unknown> | undefined): boolean {
  if (!originalDoc) return true
  return ONEC_FIELDS.some((k) => {
    if (!(k in data)) return false
    const orig = originalDoc[k]
    const next = k === 'guest' || k === 'delivery' ? { ...(orig as object), ...(data[k] as object) } : data[k]
    return JSON.stringify(canon(next)) !== JSON.stringify(canon(orig))
  })
}
