import type { CollectionConfig } from 'payload'
import { hasRole, isStaff, publishedOrStaff } from '../access'

const editor = hasRole('admin', 'content')

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Страница', plural: 'Страницы' },
  admin: { group: 'Контент', useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status', 'updatedAt'] },
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: publishedOrStaff, readVersions: isStaff, create: editor, update: editor, delete: hasRole('admin') },
  fields: [
    { name: 'title', type: 'text', label: 'Заголовок', required: true },
    { name: 'slug', type: 'text', label: 'Slug', required: true, unique: true, index: true },
    { name: 'content', type: 'richText', label: 'Содержимое' },
  ],
}
