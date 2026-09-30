import type { Payload } from 'payload'
import { CARRIER_LABEL, PAYMENT_LABEL, STATUS_LABEL } from '@/lib/format'
import { computeTotal, round2 } from '@/payload/hooks/orders'
import type { Customer, Order } from '@/payload/payload-types'

// Сайт → 1С: заказы в CommerceML 2.08 (type=sale&mode=query) и пометка выгруженных (mode=success).
// Пометка: onecExportedAt пуст — заказ к выгрузке. Любое сохранение заказа через Payload сбрасывает пометку
// (хук beforeChange в Orders), success ставит её напрямую в БД (db.updateOne без хуков, updatedAt не меняется)
// и только если заказ не менялся после query (updatedAt совпадает со снимком) — иначе изменение уйдёт следующим обменом.
// НДС не передаётся (BIZ-8): суммы строк — цена × количество из снапшота заказа.

export type ExportRefs = { customers: Map<number, Customer>; guids: Map<number, string> }
/** Что отдано в query этой сессии: success помечает только эти версии заказов. */
export type ExportSnapshot = { id: number; updatedAt: string }[]

/** Недопустимые в XML 1.0 символы, эмодзи и прочие символы вне BMP, одиночные суррогаты, VS16 и ZWJ — вырезаются. */
const BAD = /[^\t\n\r -퟿-�]|[️‍]/gu
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;', '\n': '&#10;', '\r': '&#13;', '\t': '&#9;' }
/** Экранирование текста и атрибутов; переводы строк — ссылками, чтобы отступы разметки не меняли значения. */
export const escapeXml = (v: string) => v.replace(BAD, '').replace(/[&<>"'\n\r\t]/g, (c) => ESC[c])

type Part = string | false | null | undefined
function el(name: string, body: Part | Part[], attrs = ''): string {
  if (Array.isArray(body)) {
    const kids = body.filter((b): b is string => !!b)
    return kids.length ? `<${name}${attrs}>\n${kids.join('\n').replace(/^/gm, '\t')}\n</${name}>` : ''
  }
  const t = body ? escapeXml(body).trim() : ''
  return t ? `<${name}${attrs}>${t}</${name}>` : ''
}
const prop = (name: string, value: Part) => el('ЗначениеРеквизита', value ? [el('Наименование', name), el('Значение', value)] : [])
const money = (n: number) => round2(n).toFixed(2)
/** Время в 1С — московское (UTC+3, без перехода на летнее). */
const msk = (iso: string) => {
  const s = new Date(Date.parse(iso) + 3 * 3600_000).toISOString()
  return { date: s.slice(0, 10), time: s.slice(11, 19) }
}
const PAIR = ' Код="715" НаименованиеПолное="Пара (2 шт.)"'
const PIECE = ' Код="796" НаименованиеПолное="Штука"'
const idOf = (v: number | { id: number } | null | undefined) => (typeof v === 'object' ? v?.id : v)

function counterparty(order: Order, refs: ExportRefs): string {
  const c = typeof order.customer === 'object' ? order.customer ?? undefined : order.customer ? refs.customers.get(order.customer) : undefined
  // guest — снапшот контактов на момент заказа (и у зарегистрированного клиента), профиль — запасной источник
  const g = order.guest ?? {}
  const name = g.name || c?.name
  const company = g.company || c?.company
  const legal = Boolean(company) || c?.kind === 'legal'
  const title = legal ? company || name : name
  return el('Контрагенты', [
    el('Контрагент', [
      el('Ид', c ? c.onecId || `site-c${c.id}` : `site-g${order.id}`),
      el('Наименование', title),
      el('ПолноеНаименование', title),
      el('ИНН', g.inn || c?.inn),
      legal && el('КПП', g.kpp || c?.kpp),
      el(legal ? 'ЮридическийАдрес' : 'Адрес', [el('Представление', c?.address)]),
      el('Контакты', [
        el('Контакт', (g.phone || c?.phone) ? [el('Тип', 'Телефон рабочий'), el('Значение', g.phone || c?.phone)] : []),
        el('Контакт', (g.email || c?.email) ? [el('Тип', 'Электронная почта'), el('Значение', g.email || c?.email)] : []),
      ]),
      legal && name && name !== title && el('Представители', [el('Представитель', [el('Контрагент', [el('Отношение', 'Контактное лицо'), el('Наименование', name)])])]),
      el('Роль', 'Покупатель'),
    ]),
  ])
}

export function orderXml(order: Order, refs: ExportRefs): string {
  const created = msk(order.createdAt)
  const updated = msk(order.updatedAt)
  const cost = order.delivery?.cost
  const hasDelivery = typeof cost === 'number' && Number.isFinite(cost) && cost >= 0
  const rows = order.items.map((it) => {
    const guid = refs.guids.get(idOf(it.product) ?? -1)
    return el('Товар', [
      // без GUID 1С (товар заведён на сайте) — Ид по артикулу, 1С сопоставит по Артикул
      el('Ид', guid || it.sku),
      el('Артикул', it.sku),
      el('Наименование', it.title),
      el('БазоваяЕдиница', 'пар', PAIR),
      el('ЦенаЗаЕдиницу', money(it.price)),
      el('Количество', String(it.qty)),
      el('Сумма', money(it.price * it.qty)),
      el('ЗначенияРеквизитов', [prop('ВидНоменклатуры', 'Товар'), prop('ТипНоменклатуры', 'Товар'), prop('Размер', it.size), prop('Покрытие', it.coating)]),
    ])
  })
  if (hasDelivery)
    rows.push(
      el('Товар', [
        el('Ид', 'ORDER_DELIVERY'),
        el('Наименование', 'Доставка заказа'),
        el('БазоваяЕдиница', 'шт', PIECE),
        el('ЦенаЗаЕдиницу', money(cost)),
        el('Количество', '1'),
        el('Сумма', money(cost)),
        el('ЗначенияРеквизитов', [prop('ВидНоменклатуры', 'Услуга'), prop('ТипНоменклатуры', 'Услуга')]),
      ]),
    )
  const d = order.delivery
  return el('Документ', [
    el('Ид', String(order.id)),
    el('Номер', order.number),
    el('Дата', created.date),
    el('ХозОперация', 'Заказ товара'),
    el('Роль', 'Продавец'),
    el('Валюта', 'RUB'),
    el('Курс', '1'),
    el('Сумма', money(order.total ?? computeTotal(order.items, cost))),
    counterparty(order, refs),
    el('Время', created.time),
    el('Комментарий', order.comment),
    el('Товары', rows),
    el('ЗначенияРеквизитов', [
      prop('Способ оплаты', PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod),
      prop('Статус оплаты', order.paymentStatus && (PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus)),
      prop('Статус заказа', STATUS_LABEL[order.status] ?? order.status),
      prop('Отменен', order.status === 'cancelled' ? 'true' : 'false'),
      prop('Способ доставки', d?.carrierName || (d?.carrier && (CARRIER_LABEL[d.carrier] ?? d.carrier))),
      prop('Адрес доставки', d?.city && !d.address?.includes(d.city) ? [d.city, d.address].filter(Boolean).join(', ') : d?.address),
      prop('Комментарий', order.comment),
      prop('Дата изменения', `${updated.date} ${updated.time}`),
    ]),
  ])
}

export function ordersXml(orders: Order[], refs: ExportRefs, now: Date): string {
  const t = msk(now.toISOString())
  const docs = orders.map((o) => orderXml(o, refs).replace(/^/gm, '\t'))
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<КоммерческаяИнформация ВерсияСхемы="2.08" ДатаФормирования="${t.date}T${t.time}">`,
    ...docs,
    '</КоммерческаяИнформация>',
    '',
  ].join('\n')
}

/** Заказы без пометки выгрузки (новые или изменённые после неё) + клиенты и GUID товаров для XML. */
export async function loadOrdersToExport(payload: Payload, limit: number) {
  // ponytail: limit заказов за обмен, остаток — следующим обменом; порядок — старые первыми
  const { docs: orders } = await payload.find({ collection: 'orders', where: { onecExportedAt: { exists: false } }, sort: 'createdAt', limit, depth: 0 })
  const customerIds = [...new Set(orders.map((o) => idOf(o.customer)).filter((v): v is number => typeof v === 'number'))]
  const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => idOf(i.product))).filter((v): v is number => typeof v === 'number'))]
  const customers = customerIds.length
    ? (await payload.find({ collection: 'customers', where: { id: { in: customerIds } }, limit: customerIds.length, depth: 0 })).docs
    : []
  const products = productIds.length
    ? (await payload.find({ collection: 'products', where: { id: { in: productIds } }, limit: productIds.length, depth: 0, select: { guid1c: true } })).docs
    : []
  const refs: ExportRefs = {
    customers: new Map(customers.map((c) => [c.id, c])),
    guids: new Map(products.filter((p) => p.guid1c).map((p) => [p.id, p.guid1c as string])),
  }
  const snapshot: ExportSnapshot = orders.map((o) => ({ id: o.id, updatedAt: o.updatedAt }))
  return { orders, refs, snapshot }
}

/** Пометить выгруженными версии заказов из снимка query. Повтор безопасен; изменённый после query заказ не помечается. */
export async function markExported(payload: Payload, snapshot: ExportSnapshot, now: Date): Promise<number> {
  let marked = 0
  for (const s of snapshot) {
    const doc = await payload.db.updateOne({
      collection: 'orders',
      where: { and: [{ id: { equals: s.id } }, { updatedAt: { equals: s.updatedAt } }] },
      data: { onecExportedAt: now.toISOString() },
      // один UPDATE … WHERE: сравнение updatedAt и запись без гонки с правкой заказа
      options: { atomic: true },
    })
    if (doc) marked++
  }
  return marked
}
