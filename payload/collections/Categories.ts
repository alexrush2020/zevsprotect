import type { CollectionConfig } from 'payload'
import { docTitle, slugField } from '../admin-ui'
import { hasRole } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Категория', plural: 'Категории' },
  admin: { group: 'Каталог', useAsTitle: 'title', defaultColumns: ['title', 'slug', 'order'], listSearchableFields: ['title', 'slug'], components: docTitle('Новая категория') },
  defaultSort: 'order',
  access: {
    read: () => true,
    create: hasRole('admin', 'content'),
    update: hasRole('admin', 'content'),
    delete: hasRole('admin'),
  },
  hooks: { afterChange: [revalidateAfterChange('catalog')], afterDelete: [revalidateAfterDelete('catalog')] },
  fields: [
    { name: 'title', type: 'text', label: 'Название', required: true },
    slugField(),
    { name: 'short', type: 'text', label: 'Короткое название' },
    { name: 'description', type: 'textarea', label: 'Описание' },
    { name: 'parent', type: 'relationship', relationTo: 'categories', label: 'Родитель' },
    { name: 'icon', type: 'text', label: 'Иконка (имя из прототипа)' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Картинка' },
    { name: 'order', type: 'number', label: 'Порядок', defaultValue: 0 },
  ],
}
