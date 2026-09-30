import type { CollectionConfig } from 'payload'
import { docTitle } from '../admin-ui'
import { hasRole } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

const moderators = hasRole('admin', 'manager')

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  labels: { singular: 'Отзыв', plural: 'Отзывы' },
  admin: { group: 'Каталог', useAsTitle: 'authorName', defaultColumns: ['authorName', 'product', 'rating', 'approved', 'createdAt'], listSearchableFields: ['authorName', 'company', 'city'], components: docTitle('Новый отзыв') },
  access: {
    read: (args) => (moderators(args) ? true : { approved: { equals: true } }),
    create: ({ req }) => ['users', 'customers'].includes(String(req.user?.collection)),
    update: moderators,
    delete: moderators,
  },
  hooks: {
    afterChange: [revalidateAfterChange('catalog')],
    afterDelete: [revalidateAfterDelete('catalog')],
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user?.collection === 'customers') data.customer = req.user.id
        return data
      },
    ],
  },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', label: 'Модель', required: true },
    { name: 'authorName', type: 'text', label: 'Автор', required: true },
    { name: 'company', type: 'text', label: 'Компания' },
    { name: 'city', type: 'text', label: 'Город' },
    { name: 'rating', type: 'number', label: 'Оценка', required: true, min: 1, max: 5 },
    { name: 'text', type: 'textarea', label: 'Текст', required: true },
    { name: 'colorLabel', type: 'text', label: 'Цвет в заказе' },
    { name: 'sizeLabel', type: 'text', label: 'Размер в заказе' },
    { name: 'orderDate', type: 'date', label: 'Дата заказа', admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'shipped', type: 'checkbox', label: 'Заказ отгружен', defaultValue: false },
    { name: 'shippedAt', type: 'date', label: 'Дата отгрузки', admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'recommends', type: 'checkbox', label: 'Рекомендует' },
    {
      name: 'tags',
      type: 'select',
      hasMany: true,
      label: 'Темы',
      options: [
        { label: 'Качество партии', value: 'quality' },
        { label: 'Сроки отгрузки', value: 'shipment' },
        { label: 'Хват', value: 'grip' },
        { label: 'Размер', value: 'size' },
        { label: 'Упаковка', value: 'pack' },
      ],
    },
    { name: 'customer', type: 'relationship', relationTo: 'customers', label: 'Клиент', admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'approved',
      type: 'checkbox',
      label: 'Одобрен',
      defaultValue: false,
      access: { create: moderators, update: moderators },
      admin: { position: 'sidebar' },
    },
  ],
}
