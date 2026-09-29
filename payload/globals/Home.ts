import type { GlobalConfig } from 'payload'
import { hasRole } from '../access'

export const Home: GlobalConfig = {
  slug: 'home',
  label: 'Главная',
  admin: { group: 'Контент' },
  access: { read: () => true, update: hasRole('admin', 'content') },
  fields: [
    { name: 'heroTitle', type: 'text', label: 'Заголовок первого экрана' },
    { name: 'heroText', type: 'textarea', label: 'Подзаголовок' },
    { name: 'featuredProducts', type: 'relationship', relationTo: 'products', hasMany: true, label: 'Товары на главной' },
    { name: 'featuredPosts', type: 'relationship', relationTo: 'posts', hasMany: true, label: 'Статьи на главной' },
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
