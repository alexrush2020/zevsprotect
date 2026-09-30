import type { CollectionConfig } from 'payload'
import { docTitle, statusCell } from '../admin-ui'
import { hasRole, isAdmin } from '../access'
import { enqueueB24Sync } from '../../lib/b24/sync'

const manager = hasRole('admin', 'manager')

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Заявка', plural: 'Заявки' },
  admin: { group: 'Продажи', useAsTitle: 'name', defaultColumns: ['type', 'name', 'phone', 'status', 'createdAt'], listSearchableFields: ['name', 'phone', 'email', 'company'], components: docTitle('Новая заявка') },
  defaultSort: '-createdAt',
  // create закрыт: витрина пишет через server action (lib/server/lead-action.ts) после валидации, спам-защиты и согласия ПДн
  access: { read: manager, create: manager, update: manager, delete: isAdmin },
  hooks: {
    // лид в Б24 (I-B24-LEAD); enqueueB24Sync не бросает — заявка сохраняется при любом сбое очереди
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') await enqueueB24Sync(req.payload, 'lead', doc.id)
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      label: 'Тип формы',
      required: true,
      options: [
        { label: 'Обратная связь', value: 'feedback' },
        { label: 'Расчёт поставки', value: 'calculation' },
        { label: 'Образцы', value: 'samples' },
        { label: 'Консультация', value: 'consultation' },
        { label: 'Запрос по товару', value: 'product-request' },
        { label: 'Прайс-лист', value: 'pricelist' },
        { label: 'Запрос из корзины', value: 'cart' },
      ],
    },
    { name: 'name', type: 'text', label: 'Имя' },
    { name: 'phone', type: 'text', label: 'Телефон' },
    { name: 'email', type: 'email', label: 'Email' },
    { name: 'company', type: 'text', label: 'Компания' },
    { name: 'message', type: 'textarea', label: 'Сообщение' },
    { name: 'data', type: 'json', label: 'Остальные поля формы' },
    { name: 'consentPdAt', type: 'date', label: 'Согласие на ПДн', required: true },
    { name: 'sourceUrl', type: 'text', label: 'Страница' },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      defaultValue: 'new',
      options: [
        { label: 'Новая', value: 'new' },
        { label: 'Обработана', value: 'processed' },
      ],
      admin: { position: 'sidebar', ...statusCell },
    },
    { name: 'b24LeadId', type: 'text', label: 'ID лида Б24', access: { create: isAdmin, update: isAdmin }, admin: { position: 'sidebar', readOnly: true } },
    { name: 'syncError', type: 'text', label: 'Ошибка синхронизации', access: { create: isAdmin, update: isAdmin }, admin: { position: 'sidebar', readOnly: true } },
  ],
}
