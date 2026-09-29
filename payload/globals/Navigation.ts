import type { ArrayField, GlobalConfig } from 'payload'
import { hasRole } from '../access'

const links = (name: string, label: string): ArrayField => ({
  name,
  type: 'array',
  labels: { singular: 'Пункт', plural: 'Пункты' },
  label,
  fields: [
    { name: 'label', type: 'text', label: 'Текст', required: true },
    { name: 'url', type: 'text', label: 'Ссылка', required: true },
  ],
})

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Меню',
  admin: { group: 'Контент' },
  access: { read: () => true, update: hasRole('admin', 'content') },
  fields: [links('header', 'Меню в шапке'), links('footer', 'Меню в подвале')],
}
