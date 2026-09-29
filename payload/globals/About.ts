import type { GlobalConfig } from 'payload'
import { hasRole } from '../access'

export const About: GlobalConfig = {
  slug: 'about',
  label: 'О компании',
  admin: { group: 'Контент' },
  access: { read: () => true, update: hasRole('admin', 'content') },
  fields: [
    { name: 'text', type: 'richText', label: 'Текст' },
    {
      name: 'documents',
      type: 'array',
      labels: { singular: 'Документ', plural: 'Документы' },
      label: 'Декларации соответствия',
      fields: [
        { name: 'title', type: 'text', label: 'Название', required: true },
        { name: 'file', type: 'upload', relationTo: 'media', label: 'Файл', required: true },
      ],
    },
    { name: 'workshopVideo', type: 'upload', relationTo: 'media', label: 'Видео цеха' },
  ],
}
