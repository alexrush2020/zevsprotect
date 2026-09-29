import type { DefaultCellComponentProps, SelectFieldClient } from 'payload'

// Тон бейджа по значению статуса (заказы, оплата, заявки); незнакомое значение — нейтральный.
const TONE: Record<string, 'ok' | 'pay' | 'err' | 'info'> = {
  // оплата
  pending: 'pay',
  invoiced: 'info',
  paid: 'ok',
  failed: 'err',
  // заказ
  accepted: 'info',
  picking: 'pay',
  shipped: 'info',
  delivery: 'info',
  delivered: 'ok',
  cancelled: 'err',
  // заявка
  new: 'pay',
  processed: 'ok',
}

export function StatusCell({ cellData, field }: DefaultCellComponentProps<SelectFieldClient>) {
  if (!cellData || typeof cellData !== 'string') return <span className="zp-muted">—</span>
  const option = field.options?.find((o) => (typeof o === 'string' ? o : o.value) === cellData)
  const label = option && typeof option === 'object' && typeof option.label === 'string' ? option.label : cellData
  return <span className={`zp-badge zp-badge--${TONE[cellData] ?? 'neutral'}`}>{label}</span>
}
