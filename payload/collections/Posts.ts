import type { CollectionConfig } from 'payload'
import { hasRole, publishedOrStaff } from '../access'

const editor = hasRole('admin', 'content')

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Статья', plural: 'Статьи' },
  admin: { group: 'Контент', useAsTitle: 'title', defaultColumns: ['title', 'category', 'publishedAt', '_status'] },
  defaultSort: '-publishedAt',
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: publishedOrStaff, create: editor, update: editor, delete: hasRole('admin') },
  fields: [
    { name: 'title', type: 'text', label: 'Заголовок', required: true },
    { name: 'slug', type: 'text', label: 'Slug', required: true, unique: true, index: true },
    { name: 'category', type: 'relationship', relationTo: 'post-categories', label: 'Рубрика' },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      label: 'Обложка',
      admin: { description: 'На витрине показывается целиком (contain), без обрезки — загружайте в исходных пропорциях.' },
    },
    { name: 'excerpt', type: 'textarea', label: 'Анонс', required: true },
    { name: 'content', type: 'richText', label: 'Текст' },
    {
      name: 'slides',
      type: 'array',
      label: 'Слайды',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'title', type: 'text', label: 'Подпись' },
        { name: 'alt', type: 'text', label: 'Alt' },
      ],
    },
    { name: 'related', type: 'relationship', relationTo: 'posts', hasMany: true, label: 'Связанные статьи', admin: { position: 'sidebar' } },
    { name: 'publishedAt', type: 'date', label: 'Дата публикации', admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } } },
    { name: 'home', type: 'checkbox', label: 'Показывать на главной', defaultValue: false, admin: { position: 'sidebar' } },
  ],
}
