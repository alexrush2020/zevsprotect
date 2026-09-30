import type { GlobalConfig } from 'payload'
import { hasRole } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'
import { DELIVERY_DEFAULTS as d } from '../../lib/server/content'

export const Delivery: GlobalConfig = {
  slug: 'delivery',
  label: 'Доставка',
  admin: { group: 'Контент' },
  access: { read: () => true, update: hasRole('admin', 'content') },
  hooks: { afterChange: [revalidateGlobal('content')] },
  fields: [
    { name: 'intro', type: 'richText', label: 'Вступление', admin: { description: 'Пусто — текст по умолчанию.' } },
    {
      name: 'terms',
      type: 'array',
      labels: { singular: 'Условие', plural: 'Условия' },
      label: 'Условия',
      defaultValue: d.terms,
      fields: [
        { name: 'title', type: 'text', label: 'Заголовок', required: true },
        { name: 'text', type: 'textarea', label: 'Текст', required: true },
      ],
    },
  ],
}
