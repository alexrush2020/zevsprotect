import type { CollectionConfig } from 'payload'
import { docTitle } from '../admin-ui'
import { hasRole, isAdmin } from '../access'
import { validateInn } from '../validators'

const staffRead = hasRole('admin', 'manager')

export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Клиент', plural: 'Клиенты' },
  admin: { group: 'Продажи', useAsTitle: 'email', defaultColumns: ['name', 'email', 'phone', 'company', 'kind'], listSearchableFields: ['name', 'email', 'phone', 'company', 'inn'], components: docTitle('Новый клиент') },
  auth: true,
  access: {
    read: (args) => {
      if (staffRead(args)) return true
      const u = args.req.user
      return u?.collection === 'customers' ? { id: { equals: u.id } } : false
    },
    create: () => true, // регистрация
    unlock: isAdmin,
    update: (args) => {
      if (staffRead(args)) return true
      const u = args.req.user
      return u?.collection === 'customers' ? { id: { equals: u.id } } : false
    },
    delete: isAdmin,
    admin: () => false,
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      label: 'Тип',
      defaultValue: 'person',
      options: [
        { label: 'Частное лицо', value: 'person' },
        { label: 'Юридическое лицо', value: 'legal' },
      ],
    },
    { name: 'name', type: 'text', label: 'ФИО / контактное лицо', required: true },
    { name: 'phone', type: 'text', label: 'Телефон', required: true },
    { name: 'company', type: 'text', label: 'Организация' },
    {
      name: 'inn',
      type: 'text',
      label: 'ИНН',
      validate: (v: string | null | undefined, { siblingData }: { siblingData: { kind?: 'person' | 'legal' } }) =>
        validateInn(siblingData?.kind === 'legal' ? 'legal' : siblingData?.kind === 'person' ? 'person' : undefined)(v),
    },
    { name: 'kpp', type: 'text', label: 'КПП' },
    { name: 'address', type: 'text', label: 'Юридический адрес' },
    {
      name: 'addresses',
      type: 'array',
      labels: { singular: 'Адрес', plural: 'Адреса' },
      label: 'Адреса доставки',
      fields: [
        { name: 'label', type: 'text', label: 'Название', required: true },
        { name: 'city', type: 'text', label: 'Город', required: true },
        { name: 'line', type: 'text', label: 'Адрес', required: true },
        { name: 'phone', type: 'text', label: 'Телефон' },
        { name: 'isDefault', type: 'checkbox', label: 'По умолчанию' },
      ],
    },
    { name: 'bankName', type: 'text', label: 'Банк' },
    { name: 'bankAccount', type: 'text', label: 'Расчётный счёт' },
    { name: 'bik', type: 'text', label: 'БИК' },
    {
      name: 'authProvider',
      type: 'select',
      label: 'Способ входа',
      defaultValue: 'password',
      access: { create: isAdmin, update: isAdmin },
      options: [
        { label: 'Пароль', value: 'password' },
        { label: 'Телефон', value: 'phone' },
        { label: 'Яндекс ID', value: 'yandex' },
      ],
    },
    { name: 'yandexId', type: 'text', label: 'Yandex ID', index: true, unique: true, access: { create: isAdmin, update: isAdmin } },
    { name: 'favorites', type: 'relationship', relationTo: 'products', hasMany: true, label: 'Избранное' },
    { name: 'consentPdAt', type: 'date', label: 'Согласие на обработку ПДн', admin: { readOnly: true } },
    ...['b24CompanyId', 'b24ContactId', 'onecId', 'syncError'].map((name) => ({
      name,
      type: 'text' as const,
      label: name,
      access: { create: isAdmin, update: isAdmin },
      admin: { position: 'sidebar' as const, readOnly: true },
    })),
  ],
}
