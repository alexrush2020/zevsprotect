import type { CollectionAdminOptions, Field } from 'payload'
import type { B24Kind } from '../lib/b24/target'

// Общие настройки интерфейса коллекций: заголовок документа, бейдж статуса, поле slug.

export const docTitle = (newTitle: string, prefix?: string): CollectionAdminOptions['components'] => ({
  edit: { beforeDocumentControls: [{ path: '/payload/components/DocTitle#DocTitle', clientProps: { newTitle, prefix } }] },
})

export const statusCell = { components: { Cell: '/payload/components/StatusCell#StatusCell' } }

export const slugField = (url?: string): Field => ({
  name: 'slug',
  type: 'text',
  label: 'Адрес страницы (slug)',
  required: true,
  unique: true,
  index: true,
  admin: {
    description: `Латиница, цифры и дефис, например feniks-nitril.${url ? ` На сайте: ${url}` : ''}`,
  },
})

/** Кнопка «Отправить в Б24 повторно» в боковой панели (ui-поле, колонки в БД нет). */
export const b24RetryField = (kind: B24Kind): Field => ({
  name: 'b24Retry',
  type: 'ui',
  admin: { position: 'sidebar', components: { Field: { path: '/payload/components/B24Retry#B24Retry', clientProps: { kind } } } },
})
