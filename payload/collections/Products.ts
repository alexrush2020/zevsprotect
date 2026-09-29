import type { CollectionConfig } from 'payload'
import { hasRole, isAdmin, isStaff, publishedOrStaff } from '../access'
import { isPriceLockedFor, protectFromImport } from '../hooks/products'
import { validateKnitClass } from '../validators'

const editablePrice = ({ doc, data }: { doc?: object; data?: object }) =>
  !isPriceLockedFor({ doc, data })

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Модель', plural: 'Модели' },
  admin: {
    group: 'Каталог',
    useAsTitle: 'title',
    defaultColumns: ['title', 'sku', 'category', 'price', '_status', 'updatedAt'],
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrStaff,
    readVersions: isStaff,
    create: hasRole('admin', 'content'),
    update: hasRole('admin', 'content'),
    delete: hasRole('admin'),
  },
  hooks: {
    beforeChange: [({ data, originalDoc, context }) => protectFromImport(data, originalDoc, context) as typeof data],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Основное',
          fields: [
            { name: 'title', type: 'text', label: 'Название', required: true },
            { name: 'slug', type: 'text', label: 'Slug', required: true, unique: true, index: true },
            { name: 'sku', type: 'text', label: 'Артикул', required: true, unique: true, index: true },
            { name: 'category', type: 'relationship', relationTo: 'categories', label: 'Категория', required: true },
            { name: 'description', type: 'richText', label: 'Описание' },
          ],
        },
        {
          label: 'Характеристики',
          fields: [
            { name: 'base', type: 'text', label: 'Основа' },
            { name: 'coating', type: 'text', label: 'Покрытие' },
            { name: 'coatingType', type: 'text', label: 'Вид покрытия' },
            { name: 'colors', type: 'text', hasMany: true, label: 'Цвета' },
            { name: 'sizes', type: 'text', hasMany: true, label: 'Размеры' },
            { name: 'knitClass', type: 'text', label: 'Класс вязки', validate: validateKnitClass },
            { name: 'tex', type: 'text', label: 'ТЕКС' },
            { name: 'weight', type: 'text', label: 'Вес пары' },
            { name: 'length', type: 'text', label: 'Длина модели' },
            {
              name: 'specs',
              type: 'array',
              labels: { singular: 'Характеристика', plural: 'Характеристики' },
              label: 'Характеристики (свободные)',
              fields: [
                { name: 'key', type: 'text', label: 'Название', required: true },
                { name: 'value', type: 'text', label: 'Значение', required: true },
              ],
            },
          ],
        },
        {
          label: 'Фото и документы',
          fields: [
            {
              name: 'gallery',
              type: 'array',
              labels: { singular: 'Фото', plural: 'Фото' },
              label: 'Галерея (первое фото — главное)',
              fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
            },
            {
              name: 'documents',
              type: 'array',
              labels: { singular: 'Документ', plural: 'Документы' },
              label: 'Документы (декларации)',
              fields: [
                { name: 'title', type: 'text', label: 'Название', required: true },
                { name: 'file', type: 'upload', relationTo: 'media', required: true },
              ],
            },
          ],
        },
        {
          label: 'Цена и остатки',
          description: 'Данные из 1С. Правятся вручную только при включённом «Ручное управление».',
          fields: [
            { name: 'price', type: 'number', label: 'Цена за единицу, ₽', min: 0, access: { update: editablePrice } },
            { name: 'stock', type: 'number', label: 'В наличии', min: 0, access: { update: editablePrice } },
            { name: 'unit', type: 'text', label: 'Единица', defaultValue: 'пара', access: { update: editablePrice } },
            { name: 'minQty', type: 'number', label: 'Минимальный заказ', defaultValue: 50, min: 1 },
            { name: 'packSizes', type: 'number', hasMany: true, label: 'Кратность упаковки' },
          ],
        },
      ],
    },
    {
      name: 'badges',
      type: 'select',
      hasMany: true,
      label: 'Метки на карточке',
      options: [
        { label: 'Хит', value: 'hit' },
        { label: 'Новинка', value: 'new' },
        { label: 'Акция', value: 'sale' },
        { label: 'Избранное на главной', value: 'home' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'guid1c', type: 'text', label: 'GUID 1С', unique: true, index: true, access: { create: isAdmin, update: isAdmin }, admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'manualOverride',
      type: 'checkbox',
      label: 'Ручное управление (не перезаписывать из 1С)',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    { name: 'related', type: 'relationship', relationTo: 'products', hasMany: true, label: 'Похожие модели', admin: { position: 'sidebar' } },
  ],
}
