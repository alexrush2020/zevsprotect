import type { GlobalConfig } from 'payload'
import { hasRole } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

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
  hooks: { afterChange: [revalidateGlobal('content')] },
  fields: [
    {
      name: 'contacts',
      type: 'group',
      label: 'Контакты',
      fields: [
        { name: 'phone', type: 'text', label: 'Телефон' },
        { name: 'email', type: 'email', label: 'Email' },
        { name: 'address', type: 'text', label: 'Адрес' },
        { name: 'max', type: 'text', label: 'Ссылка на MAX', admin: { description: 'Только https://…' } },
        { name: 'hours', type: 'text', label: 'Часы работы', admin: { placeholder: 'Пн–Пт 8:00–17:00' } },
        {
          name: 'desks',
          type: 'array',
          labels: { singular: 'Отдел', plural: 'Отделы' },
          label: 'Отделы (страница «Контакты»)',
          admin: { description: 'Пусто — отделы по умолчанию.' },
          fields: [
            { name: 'title', type: 'text', label: 'Отдел', required: true },
            { name: 'phone', type: 'text', label: 'Телефон' },
            { name: 'email', type: 'email', label: 'Email', required: true },
          ],
        },
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
        {
          name: 'yandexMetrika',
          type: 'text',
          label: 'ID Яндекс.Метрики',
          admin: { description: 'Номер счётчика (только цифры). Пусто — счётчик на сайте не подключается.' },
        },
        // TODO(BIZ-3): GA передаёт данные за рубеж (152-ФЗ, CONTRA-4) — на витрине не подключается до решения бизнеса
        {
          name: 'googleAnalytics',
          type: 'text',
          label: 'ID Google Analytics',
          admin: { description: 'Пока не подключается: нужно решение по 152-ФЗ (BIZ-3).' },
        },
      ],
    },
    {
      name: 'b24StageMap',
      type: 'array',
      labels: { singular: 'Соответствие', plural: 'Соответствия' },
      label: 'Стадии Б24 → статус заказа',
      admin: { description: 'ID стадии сделки из Б24 (STAGE_ID). Несопоставленная стадия заказ не меняет.' },
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
        {
          name: 'paymentStatus',
          type: 'select',
          label: 'Статус оплаты (необязательно)',
          admin: { description: 'Пусто — статус оплаты заказа не меняется.' },
          options: [
            { label: 'Ожидает', value: 'pending' },
            { label: 'Счёт выставлен', value: 'invoiced' },
            { label: 'Оплачен', value: 'paid' },
            { label: 'Ошибка', value: 'failed' },
          ],
        },
      ],
    },
  ],
}
