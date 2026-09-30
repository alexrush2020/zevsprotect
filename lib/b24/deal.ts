import type { Order } from '@/payload/payload-types'
import { B24_ORIGINATOR, B24_UF, b24Config, findOrAdd, lines, multi, optional } from './config'
import { syncCustomerToB24 } from './company'
import { registerB24Handler } from './sync'

// I-B24-DEAL: заказ → crm.deal.add (+ компания/контакт клиента) + crm.deal.productrows.set.
// Суммы и названия — из снапшота заказа, ничего не пересчитываем.

const PAYMENT: Record<Order['paymentMethod'], string> = {
  invoice_auto: 'Счёт (авто)',
  invoice_manager: 'Счёт (менеджер)',
  online: 'Онлайн',
}
const CARRIER: Record<NonNullable<NonNullable<Order['delivery']>['carrier']>, string> = {
  cdek: 'СДЭК',
  terminal: 'Терминал ТК',
  pickup: 'Самовывоз',
}

const rub = (n: number | null | undefined) => `${(n ?? 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`

export function deliveryText(d: Order['delivery']) {
  if (!d) return ''
  return [d.carrier && CARRIER[d.carrier], d.carrierName, d.city, d.address, d.cost != null && `стоимость ${rub(d.cost)}`].filter(Boolean).join(', ')
}

export function productRows(order: Order) {
  const rows = order.items.map((i) => ({
    PRODUCT_NAME: [i.sku, i.title].filter(Boolean).join(' ') + [i.size && `, р. ${i.size}`, i.coating && `, ${i.coating}`].filter(Boolean).join(''),
    PRICE: i.price,
    QUANTITY: i.qty,
  }))
  const cost = order.delivery?.cost
  // доставка строкой: сумма строк сделки = total заказа (computeTotal = позиции + доставка)
  if (cost && cost > 0) rows.push({ PRODUCT_NAME: `Доставка: ${deliveryText({ ...order.delivery, cost: undefined })}`.replace(/: $/, ''), PRICE: cost, QUANTITY: 1 })
  return rows
}

/** Покупатель, как указан при оформлении (может отличаться от профиля клиента). */
export function checkoutBuyerText(g: Order['guest']) {
  if (!g) return ''
  return [g.name, g.company, g.inn && `ИНН ${g.inn}`, g.kpp && `КПП ${g.kpp}`, g.phone, g.email].filter(Boolean).join(', ')
}

export function dealFields(order: Order, who: { companyId?: string; contactId?: string; clientText: string }) {
  const cfg = b24Config()
  const delivery = deliveryText(order.delivery)
  return {
    TITLE: `Заказ ${order.number} с сайта`,
    BEGINDATE: order.createdAt,
    OPPORTUNITY: order.total ?? 0,
    CURRENCY_ID: 'RUB',
    IS_MANUAL_OPPORTUNITY: 'Y', // сумма как в заказе, Б24 не пересчитывает по строкам
    SOURCE_ID: cfg.sourceId,
    SOURCE_DESCRIPTION: `Заказ на ${B24_ORIGINATOR}`,
    COMMENTS: lines(
      `Заказ ${order.number} от ${new Date(order.createdAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
      `Клиент: ${who.clientText}`,
      checkoutBuyerText(order.guest) && `Данные оформления: ${checkoutBuyerText(order.guest)}`,
      `Оплата: ${PAYMENT[order.paymentMethod]}`,
      delivery && `Доставка: ${delivery}`,
      `Сумма: ${rub(order.total)}`,
      order.comment && `Комментарий клиента: ${order.comment}`,
    ),
    ...optional('COMPANY_ID', who.companyId),
    ...(who.contactId ? { CONTACT_IDS: [who.contactId] } : {}),
    ...optional('CATEGORY_ID', cfg.dealCategoryId),
    ...optional('STAGE_ID', cfg.dealStageId),
    ...optional('ASSIGNED_BY_ID', cfg.assignedById),
    ...optional(B24_UF.dealOrderNumber, order.number),
    ...optional(B24_UF.dealPaymentMethod, PAYMENT[order.paymentMethod]),
    ...optional(B24_UF.dealDelivery, delivery),
  }
}

registerB24Handler('order', async ({ doc: order, b24, payload }) => {
  const cfg = b24Config()
  let who: { companyId?: string; contactId?: string; clientText: string }

  if (order.customer) {
    const customerId = typeof order.customer === 'object' ? order.customer.id : order.customer
    // клиент ещё не в Б24 (или его job не дошёл) — синхронизируем здесь, сделка ссылается на компанию/контакт
    const { companyId, contactId, title } = await syncCustomerToB24({ customerId, b24, payload })
    who = { companyId, contactId, clientText: title }
  } else {
    const g = order.guest ?? {}
    // BIZ-7 не решён: сделка по гостевому заказу только при B24_GUEST_DEALS=1
    if (!cfg.guestDeals) {
      payload.logger.info({ msg: `Б24: гостевой заказ ${order.number} не отправлен (B24_GUEST_DEALS выключен, BIZ-7)` })
      return null
    }
    const contactId = await findOrAdd(b24, 'contact', `order:${order.number}`, {
      NAME: g.name || g.phone || 'Гость',
      PHONE: multi(g.phone),
      EMAIL: multi(g.email),
      TYPE_ID: 'CLIENT',
      SOURCE_ID: cfg.sourceId,
      SOURCE_DESCRIPTION: `Гостевой заказ ${order.number} на ${B24_ORIGINATOR}`,
      ...optional('COMMENTS', lines(g.company && `Компания: ${g.company}`, g.inn && `ИНН: ${g.inn}`, g.kpp && `КПП: ${g.kpp}`)),
      ...optional('ASSIGNED_BY_ID', cfg.assignedById),
    })
    who = { contactId, clientText: 'гость (без регистрации), данные — ниже' }
  }

  const dealId = await findOrAdd(b24, 'deal', order.number, dealFields(order, who))
  // set заменяет строки целиком — повтор после сбоя не удваивает состав
  await b24.call('crm.deal.productrows.set', { id: dealId, rows: productRows(order) })
  return dealId
})
