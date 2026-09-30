import type { GlobalConfig } from 'payload'
import { hasRole } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'
import { HOME_DEFAULTS as d } from '../../lib/server/content'

/** Пустое поле или пустой список — на сайте текст по умолчанию (lib/server/content.ts). */
const empty = 'Пусто — на сайте текст по умолчанию.'

export const Home: GlobalConfig = {
  slug: 'home',
  label: 'Главная',
  admin: { group: 'Контент' },
  access: { read: () => true, update: hasRole('admin', 'content') },
  hooks: { afterChange: [revalidateGlobal('content')] },
  fields: [
    {
      name: 'heroTitle',
      type: 'textarea',
      label: 'Заголовок первого экрана',
      admin: { placeholder: d.heroTitle.join('\n'), description: `Каждая строка — отдельная строка заголовка. ${empty}` },
    },
    { name: 'heroText', type: 'textarea', label: 'Подзаголовок', admin: { placeholder: d.heroText, description: empty } },
    {
      name: 'stats',
      type: 'array',
      labels: { singular: 'Цифра', plural: 'Цифры' },
      label: 'Цифры первого экрана',
      defaultValue: d.stats.map((s) => ({ value: s.to, suffix: s.suffix, label: s.label })),
      fields: [
        { name: 'value', type: 'number', label: 'Число', required: true, min: 0 },
        { name: 'suffix', type: 'text', label: 'Суффикс (например, +)' },
        { name: 'label', type: 'text', label: 'Подпись', required: true },
      ],
    },
    { name: 'aboutTitle', type: 'text', label: 'Блок «О компании»: заголовок', admin: { placeholder: d.aboutTitle, description: empty } },
    { name: 'aboutText', type: 'textarea', label: 'Блок «О компании»: текст', admin: { placeholder: d.aboutText, description: empty } },
    {
      name: 'advantages',
      type: 'array',
      labels: { singular: 'Преимущество', plural: 'Преимущества' },
      label: 'Почему закупают у нас',
      defaultValue: d.advantages,
      fields: [
        { name: 'title', type: 'text', label: 'Заголовок', required: true },
        { name: 'text', type: 'textarea', label: 'Текст', required: true },
      ],
    },
    {
      name: 'terms',
      type: 'array',
      labels: { singular: 'Пункт', plural: 'Пункты' },
      label: 'Условия покупки',
      defaultValue: d.terms.map((text) => ({ text })),
      fields: [{ name: 'text', type: 'text', label: 'Текст', required: true }],
    },
    { name: 'reviewsTitle', type: 'text', label: 'Доска отзывов: заголовок', admin: { placeholder: d.reviewsTitle, description: empty } },
    {
      name: 'reviews',
      type: 'array',
      labels: { singular: 'Отзыв', plural: 'Отзывы' },
      label: 'Доска отзывов',
      defaultValue: d.reviews,
      fields: [
        { name: 'company', type: 'text', label: 'Компания', required: true },
        { name: 'city', type: 'text', label: 'Город' },
        { name: 'line', type: 'text', label: 'Строка под городом' },
        { name: 'text', type: 'textarea', label: 'Отзыв', required: true },
        { name: 'fact', type: 'text', label: 'Итог (оранжевая строка)' },
      ],
    },
    {
      name: 'stamps',
      type: 'array',
      labels: { singular: 'Клиент', plural: 'Клиенты' },
      label: 'Бегущая строка клиентов',
      defaultValue: d.stamps.map((s) => ({ label: s.label })),
      fields: [{ name: 'label', type: 'text', label: 'Название', required: true }],
    },
    { name: 'ctaTitle', type: 'text', label: 'Заявка: заголовок', admin: { placeholder: d.ctaTitle, description: empty } },
    { name: 'ctaText', type: 'textarea', label: 'Заявка: текст', admin: { placeholder: d.ctaText, description: empty } },
    {
      name: 'featuredProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Товары на главной',
      admin: { description: 'Пусто — товары с бейджем «На главной».' },
    },
    {
      name: 'featuredPosts',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      label: 'Статьи на главной',
      admin: { description: 'Пусто — статьи с флагом «Показывать на главной».' },
    },
    {
      name: 'banners',
      type: 'array',
      labels: { singular: 'Баннер', plural: 'Баннеры' },
      label: 'Баннеры',
      fields: [
        { name: 'title', type: 'text', label: 'Заголовок', required: true },
        { name: 'text', type: 'textarea', label: 'Текст' },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Изображение' },
        { name: 'url', type: 'text', label: 'Ссылка' },
      ],
    },
  ],
}
