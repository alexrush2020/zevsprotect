import type { Role } from '../access'

export type NavItem = { label: string; href: string; roles: Role[] }
export type NavGroup = { title: string; items: NavItem[] }

const col = (slug: string) => `/admin/collections/${slug}`
const glob = (slug: string) => `/admin/globals/${slug}`
const ALL: Role[] = ['admin', 'manager', 'content']

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Каталог',
    items: [
      { label: 'Модели', href: col('products'), roles: ALL },
      { label: 'Категории', href: col('categories'), roles: ALL },
      { label: 'Медиа', href: col('media'), roles: ALL },
      { label: 'Отзывы', href: col('reviews'), roles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Контент',
    items: [
      { label: 'Статьи', href: col('posts'), roles: ALL },
      { label: 'Рубрики блога', href: col('post-categories'), roles: ALL },
      { label: 'Страницы', href: col('pages'), roles: ALL },
      { label: 'Меню', href: glob('navigation'), roles: ALL },
      { label: 'Главная', href: glob('home'), roles: ALL },
      { label: 'О компании', href: glob('about'), roles: ALL },
      { label: 'Доставка', href: glob('delivery'), roles: ALL },
      // content не читает requisites, но глобал доступен — пункт скрыт намеренно
      { label: 'Настройки', href: glob('settings'), roles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Продажи',
    items: [
      { label: 'Клиенты', href: col('customers'), roles: ['admin', 'manager'] },
      { label: 'Заказы', href: col('orders'), roles: ['admin', 'manager'] },
      { label: 'Заявки', href: col('leads'), roles: ['admin', 'manager'] },
    ],
  },
  { title: 'Система', items: [{ label: 'Пользователи', href: col('users'), roles: ['admin'] }] },
]

export function visibleGroups(role: Role | undefined): NavGroup[] {
  if (!role) return []
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter(
    (g) => g.items.length > 0,
  )
}
