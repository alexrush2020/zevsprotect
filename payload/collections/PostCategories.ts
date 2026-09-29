import type { CollectionConfig } from 'payload'
import { docTitle, slugField } from '../admin-ui'
import { hasRole } from '../access'

const editor = hasRole('admin', 'content')

export const PostCategories: CollectionConfig = {
  slug: 'post-categories',
  labels: { singular: 'Рубрика блога', plural: 'Рубрики блога' },
  admin: { group: 'Контент', useAsTitle: 'title', listSearchableFields: ['title', 'slug'], components: docTitle('Новая рубрика') },
  access: { read: () => true, create: editor, update: editor, delete: hasRole('admin') },
  fields: [
    { name: 'title', type: 'text', label: 'Название', required: true },
    slugField(),
  ],
}
