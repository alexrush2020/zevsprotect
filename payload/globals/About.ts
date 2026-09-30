import type { GlobalConfig } from 'payload'
import { hasRole } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'
import { ABOUT_DEFAULTS as d } from '../../lib/server/content'

const empty = 'Пусто — на сайте значение по умолчанию.'

export const About: GlobalConfig = {
  slug: 'about',
  label: 'О компании',
  admin: { group: 'Контент' },
  access: { read: () => true, update: hasRole('admin', 'content') },
  hooks: { afterChange: [revalidateGlobal('content')] },
  fields: [
    {
      name: 'text',
      type: 'richText',
      label: 'Текст',
      admin: { description: `Первый абзац — под заголовком «Как устроен цех», остальные — мелким текстом ниже. ${empty}` },
    },
    { name: 'capacity', type: 'number', label: 'Пар в сутки', min: 1, admin: { placeholder: String(d.capacity), description: empty } },
    {
      name: 'whyLead',
      type: 'array',
      labels: { singular: 'Пункт', plural: 'Пункты' },
      label: 'Почему мы (рядом с фото)',
      defaultValue: d.whyLead,
      fields: [
        { name: 'title', type: 'text', label: 'Заголовок', required: true },
        { name: 'text', type: 'textarea', label: 'Текст', required: true },
      ],
    },
    { name: 'modelsCount', type: 'number', label: 'Моделей в ассортименте', min: 1, admin: { placeholder: String(d.modelsCount), description: empty } },
    { name: 'regions', type: 'number', label: 'Регионов отгрузки', min: 1, admin: { placeholder: String(d.regions), description: empty } },
    {
      name: 'geo',
      type: 'array',
      labels: { singular: 'Направление', plural: 'Направления' },
      label: 'География и сроки',
      defaultValue: d.geo.map(([title, detail]) => ({ title, detail })),
      fields: [
        { name: 'title', type: 'text', label: 'Регион', required: true },
        { name: 'detail', type: 'text', label: 'Срок / пояснение', required: true },
      ],
    },
    {
      name: 'documents',
      type: 'array',
      labels: { singular: 'Документ', plural: 'Документы' },
      label: 'Декларации соответствия',
      admin: { description: 'Блок «Документы к партии». Пусто — документы по умолчанию.' },
      fields: [
        { name: 'title', type: 'text', label: 'Название', required: true },
        { name: 'file', type: 'upload', relationTo: 'media', label: 'Файл', required: true },
      ],
    },
    { name: 'workshopVideo', type: 'upload', relationTo: 'media', label: 'Видео цеха' },
  ],
}
