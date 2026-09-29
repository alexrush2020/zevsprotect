import type { CollectionConfig } from 'payload'
import { hasRole } from '../access'

const moderators = hasRole('admin', 'manager')

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  labels: { singular: 'Отзыв', plural: 'Отзывы' },
  admin: { group: 'Каталог', useAsTitle: 'authorName', defaultColumns: ['authorName', 'product', 'rating', 'approved', 'createdAt'] },
  access: {
    read: (args) => (moderators(args) ? true : { approved: { equals: true } }),
    create: ({ req }) => ['users', 'customers'].includes(String(req.user?.collection)),
    update: moderators,
    delete: moderators,
  },
  hooks: {
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
