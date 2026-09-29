import type { GlobalConfig } from 'payload'
import { hasRole } from '../access'

export const Delivery: GlobalConfig = {
  slug: 'delivery',
  label: 'Доставка',
  admin: { group: 'Контент' },
  access: { read: () => true, update: hasRole('admin', 'content') },
  fields: [
    { name: 'intro', type: 'richText', label: 'Вступление' },
    {
      name: 'terms',
      type: 'array',
      label: 'Условия',
      fields: [
        { name: 'title', type: 'text', label: 'Заголовок', required: true },
        { name: 'text', type: 'textarea', label: 'Текст', required: true },
      ],
    },
  ],
}
