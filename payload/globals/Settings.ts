import type { GlobalConfig } from 'payload'
import { hasRole } from '../access'

const admin = hasRole('admin')

const requisiteFields: [string, string][] = [
  ['legalName', 'Юр. название'],
  ['inn', 'ИНН'],
  ['kpp', 'КПП'],
  ['ogrn', 'ОГРН'],
  ['bankName', 'Банк'],
  ['bankAccount', 'Расчётный счёт'],
  ['corrAccount', 'Корр. счёт'],
  ['bik', 'БИК'],
]

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Настройки',
  admin: { group: 'Контент' },
  access: { read: () => true, update: admin }, // публичны только контакты — реквизиты и b24StageMap закрыты полевым read
  fields: [
    {
      name: 'contacts',
      type: 'group',
      label: 'Контакты',
      fields: [
        { name: 'phone', type: 'text', label: 'Телефон' },
        { name: 'email', type: 'email', label: 'Email' },
        { name: 'address', type: 'text', label: 'Адрес' },
        { name: 'max', type: 'text', label: 'Ссылка на MAX' },
      ],
    },
    {
      name: 'requisites',
      type: 'group',
      label: 'Реквизиты для счёта',
      access: { read: hasRole('admin', 'manager') },
      fields: requisiteFields.map(([name, label]) => ({ name, type: 'text' as const, label })),
    },
    {
      name: 'analytics',
      type: 'group',
      label: 'Счётчики',
      fields: [
        { name: 'yandexMetrika', type: 'text', label: 'ID Яндекс.Метрики' },
        { name: 'googleAnalytics', type: 'text', label: 'ID Google Analytics' },
      ],
    },
    {
      name: 'b24StageMap',
      type: 'array',
      labels: { singular: 'Соответствие', plural: 'Соответствия' },
      label: 'Стадии Б24 → статус заказа',
      access: { read: hasRole('admin', 'manager') },
      fields: [
        { name: 'stage', type: 'text', label: 'Стадия сделки Б24', required: true },
        {
          name: 'status',
          type: 'select',
          label: 'Статус заказа',
          required: true,
          options: [
            { label: 'Принят', value: 'accepted' },
            { label: 'Комплектуется', value: 'picking' },
            { label: 'Отгружен', value: 'shipped' },
            { label: 'В доставке', value: 'delivery' },
            { label: 'Доставлен', value: 'delivered' },
            { label: 'Отменён', value: 'cancelled' },
          ],
        },
      ],
    },
  ],
}
