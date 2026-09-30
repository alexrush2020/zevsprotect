import type { CollectionConfig } from 'payload'
import { docTitle } from '../admin-ui'
import { hasRole } from '../access'
import { kindFromMime } from '../hooks/media'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

const MB = 1024 * 1024

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Файл', plural: 'Медиа' },
  admin: { group: 'Каталог', useAsTitle: 'title', defaultColumns: ['filename', 'title', 'kind', 'updatedAt'], listSearchableFields: ['title', 'filename', 'alt'], components: docTitle('Новый файл') },
  access: {
    read: () => true,
    create: hasRole('admin', 'content'),
    update: hasRole('admin', 'content'),
    delete: hasRole('admin', 'content'),
  },
  hooks: {
    // URL файла меняется при замене — кэш витрины держит старый
    afterChange: [revalidateAfterChange('catalog'), revalidateAfterChange('blog')],
    afterDelete: [revalidateAfterDelete('catalog'), revalidateAfterDelete('blog')],
    beforeChange: [
      ({ data, originalDoc, req }) => {
        const size = req.file?.size ?? 0
        if (req.file?.mimetype?.startsWith('image/') && size > 10 * MB)
          throw new Error('Изображение больше 10 МБ')
        data.kind = kindFromMime(req.file?.mimetype ?? data.mimeType ?? originalDoc?.mimeType)
        return data
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt-текст',
      validate: (v: string | null | undefined, { data }: { data: { mimeType?: string } }) =>
        !data?.mimeType?.startsWith('image/') || !!v ? true : 'Alt-текст обязателен для изображений',
    },
    { name: 'title', type: 'text', label: 'Заголовок' },
    {
      name: 'kind',
      type: 'select',
      label: 'Тип',
      options: [
        { label: 'Изображение', value: 'image' },
        { label: 'Документ', value: 'doc' },
      ],
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  upload: {
    focalPoint: true,
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    imageSizes: [
      { name: 'thumbnail', width: 300, height: 300 },
      { name: 'card', width: 600, height: 600 },
      { name: 'hero', width: 1200, height: 1200 },
    ],
    adminThumbnail: 'thumbnail',
  },
}
