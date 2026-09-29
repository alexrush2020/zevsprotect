import type { CollectionConfig } from 'payload'
import { hasRole } from '../access'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Категория', plural: 'Категории' },
  admin: { group: 'Каталог', useAsTitle: 'title', defaultColumns: ['title', 'slug', 'order'] },
  defaultSort: 'order',
  access: {
    read: () => true,
    create: hasRole('admin', 'content'),
    update: hasRole('admin', 'content'),
    delete: hasRole('admin'),
  },
  fields: [
    { name: 'title', type: 'text', label: 'Название', required: true },
    { name: 'slug', type: 'text', label: 'Slug', required: true, unique: true, index: true },
    { name: 'parent', type: 'relationship', relationTo: 'categories', label: 'Родитель' },
    { name: 'icon', type: 'text', label: 'Иконка (имя из прототипа)' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Картинка' },
    { name: 'order', type: 'number', label: 'Порядок', defaultValue: 0 },
  ],
}
