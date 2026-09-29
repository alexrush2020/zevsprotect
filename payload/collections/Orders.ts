import type { CollectionConfig } from 'payload'
import { hasRole, isAdmin, ownOrRoles } from '../access'
import { computeTotal, formatOrderNumber, hasCustomerOrGuest, nextStatusHistory } from '../hooks/orders'

const manager = hasRole('admin', 'manager')
const syncField = (name: string, label: string) => ({
  name,
  type: 'text' as const,
  label,
  access: { create: isAdmin, update: isAdmin },
  admin: { position: 'sidebar' as const, readOnly: true },
})

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Заказ', plural: 'Заказы' },
  admin: {
    group: 'Продажи',
    useAsTitle: 'number',
    defaultColumns: ['number', 'customer', 'total', 'status', 'paymentStatus', 'createdAt'],
    listSearchableFields: ['number', 'guest.name', 'guest.phone'],
  },
  defaultSort: '-createdAt',
  access: {
    read: ownOrRoles('customer', 'admin', 'manager'),
    create: manager, // заказы витрины создаёт серверный код с overrideAccess
    update: manager,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && data && !data.number) {
          const year = new Date().getFullYear()
          const { totalDocs } = await req.payload.count({
            collection: 'orders',
            where: { number: { like: `ZP-${year}-` } },
            req,
          })
          // ponytail: count+1 — при гонке unique-индекс вернёт ошибку, вызывающий повторяет; счётчик-sequence при нагрузке
          data.number = formatOrderNumber(year, totalDocs + 1)
        }
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        data.total = computeTotal(data.items ?? originalDoc?.items, data.delivery?.cost ?? originalDoc?.delivery?.cost)
        const status = data.status ?? originalDoc?.status
        if (status)
          data.statusHistory = nextStatusHistory(originalDoc?.statusHistory, originalDoc?.status, status, new Date().toISOString())
        return data
      },
    ],
  },
  fields: [
    { name: 'number', type: 'text', label: 'Номер', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'customer', type: 'relationship', relationTo: 'customers', label: 'Клиент' },
    {
      name: 'guest',
      type: 'group',
      label: 'Гость (без регистрации)',
      fields: [
        { name: 'name', type: 'text', label: 'Имя' },
        {
          name: 'phone',
          type: 'text',
          label: 'Телефон',
          validate: (v: string | null | undefined, { data }: { data: { customer?: unknown } }) =>
            hasCustomerOrGuest({ customer: data?.customer, guest: { phone: v ?? undefined } })
              ? true
              : 'Укажите клиента или телефон гостя',
        },
        { name: 'email', type: 'email', label: 'Email' },
        { name: 'company', type: 'text', label: 'Компания' },
        { name: 'inn', type: 'text', label: 'ИНН' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      label: 'Состав (снапшот)',
      required: true,
      minRows: 1,
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products', label: 'Модель' },
        { name: 'sku', type: 'text', label: 'Артикул' },
        { name: 'title', type: 'text', label: 'Название', required: true },
        { name: 'size', type: 'text', label: 'Размер' },
        { name: 'coating', type: 'text', label: 'Покрытие' },
        { name: 'price', type: 'number', label: 'Цена, ₽', required: true, min: 0 },
        { name: 'qty', type: 'number', label: 'Кол-во', required: true, min: 1 },
      ],
    },
    { name: 'total', type: 'number', label: 'Итого, ₽', admin: { readOnly: true } },
    {
      name: 'delivery',
      type: 'group',
      label: 'Доставка',
      fields: [
        { name: 'city', type: 'text', label: 'Город' },
        {
          name: 'carrier',
          type: 'select',
          label: 'Способ',
          options: [
            { label: 'СДЭК', value: 'cdek' },
            { label: 'Терминал ТК', value: 'terminal' },
            { label: 'Самовывоз', value: 'pickup' },
          ],
        },
        { name: 'carrierName', type: 'text', label: 'Перевозчик' },
        { name: 'cost', type: 'number', label: 'Стоимость, ₽', min: 0 },
        { name: 'address', type: 'text', label: 'Адрес' },
      ],
    },
    { name: 'comment', type: 'textarea', label: 'Комментарий' },
    {
      name: 'paymentMethod',
      type: 'select',
      label: 'Оплата',
      required: true,
      options: [
        { label: 'Счёт (авто)', value: 'invoice_auto' },
        { label: 'Счёт (менеджер)', value: 'invoice_manager' },
        { label: 'Онлайн', value: 'online' },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      label: 'Статус оплаты',
      defaultValue: 'pending',
      options: [
        { label: 'Ожидает', value: 'pending' },
        { label: 'Счёт выставлен', value: 'invoiced' },
        { label: 'Оплачен', value: 'paid' },
        { label: 'Ошибка', value: 'failed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      defaultValue: 'accepted',
      required: true,
      options: [
        { label: 'Принят', value: 'accepted' },
        { label: 'Комплектуется', value: 'picking' },
        { label: 'Отгружен', value: 'shipped' },
        { label: 'В доставке', value: 'delivery' },
        { label: 'Доставлен', value: 'delivered' },
        { label: 'Отменён', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'statusHistory',
      type: 'array',
      label: 'История статусов',
      access: { create: () => false, update: () => false },
      admin: { readOnly: true },
      fields: [
        { name: 'at', type: 'date', label: 'Когда', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'status', type: 'text', label: 'Статус' },
        { name: 'note', type: 'text', label: 'Комментарий' },
      ],
    },
    { name: 'consentPdAt', type: 'date', label: 'Согласие на ПДн', admin: { readOnly: true } },
    { name: 'paymentId', type: 'text', label: 'ID платежа', unique: true, index: true, admin: { position: 'sidebar', readOnly: true } },
    { name: 'onecExportedAt', type: 'date', label: 'Выгружен в 1С', admin: { position: 'sidebar', readOnly: true } },
    syncField('b24DealId', 'ID сделки Б24'),
    syncField('syncError', 'Ошибка синхронизации'),
  ],
}
