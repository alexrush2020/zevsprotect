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
