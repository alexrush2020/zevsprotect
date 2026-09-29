import type { CollectionConfig } from 'payload'
import { hasRole, isAdmin } from '../access'

const manager = hasRole('admin', 'manager')

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Заявка', plural: 'Заявки' },
  admin: { group: 'Продажи', useAsTitle: 'name', defaultColumns: ['type', 'name', 'phone', 'status', 'createdAt'] },
  defaultSort: '-createdAt',
  access: { read: manager, create: () => true, update: manager, delete: isAdmin },
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
      admin: { position: 'sidebar' },
    },
    { name: 'b24LeadId', type: 'text', label: 'ID лида Б24', access: { create: isAdmin, update: isAdmin }, admin: { position: 'sidebar', readOnly: true } },
    { name: 'syncError', type: 'text', label: 'Ошибка синхронизации', access: { create: isAdmin, update: isAdmin }, admin: { position: 'sidebar', readOnly: true } },
  ],
}
