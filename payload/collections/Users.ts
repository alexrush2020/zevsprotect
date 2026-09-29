import type { CollectionConfig } from 'payload'
import { isAdmin, selfOrAdmin } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Пользователь', plural: 'Пользователи' },
  admin: { useAsTitle: 'email', group: 'Система', defaultColumns: ['email', 'name', 'role'] },
  auth: true,
  access: {
    read: selfOrAdmin,
    create: isAdmin,
    update: selfOrAdmin,
    delete: isAdmin,
    admin: ({ req }) => req.user?.collection === 'users',
  },
  hooks: {
    // Первый пользователь без роли остался бы без прав — делаем его admin.
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', req })
          if (totalDocs === 0) data.role = 'admin'
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', label: 'Имя' },
    {
      name: 'role',
      type: 'select',
      label: 'Роль',
      required: true,
      defaultValue: 'content',
      options: [
        { label: 'Администратор', value: 'admin' },
        { label: 'Менеджер', value: 'manager' },
        { label: 'Контент-менеджер', value: 'content' },
      ],
      access: { create: isAdmin, update: isAdmin },
    },
  ],
}
