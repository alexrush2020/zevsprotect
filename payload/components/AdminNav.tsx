import type { ServerProps } from 'payload'
import type { Role } from '../access'
import { Icon as BrandMark } from './Brand'
import { NavAutoOpen } from './NavAutoOpen'
import { NavLink } from './NavLink'
import { ThemeToggle } from './ThemeToggle'
import { visibleGroups } from './nav-config'

// Пути иконок из макета (AdminNav.dc.html), ключ — slug коллекции/глобала.
const ICONS: Record<string, string> = {
  dashboard: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  products: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  categories: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01',
  'post-categories': 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01',
  media: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M9 9h.01',
  posts: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7',
  pages: 'M4 4h16v16H4zM4 9h16M9 9v11',
  customers: 'M16 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-2a4 4 0 00-3-3.9M16 3.1a3.5 3.5 0 010 6.8',
  users: 'M16 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-2a4 4 0 00-3-3.9M16 3.1a3.5 3.5 0 010 6.8',
  orders: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  leads: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  reviews: 'M4 4h16v12H8l-4 4zM8 9h8M8 12h5',
  navigation: 'M4 6h16M4 12h16M4 18h10',
  home: 'M4 4h16v16H4zM4 9h16M9 9v11',
  about: 'M4 4h16v16H4zM4 9h16M9 9v11',
  delivery: 'M4 4h16v16H4zM4 9h16M9 9v11',
  settings:
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
}

const ROLE_LABEL: Record<Role, string> = { admin: 'администратор', manager: 'менеджер', content: 'редактор' }

function Icon({ d }: { d?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d ?? ICONS.pages} />
    </svg>
  )
}

export function AdminNav({ user }: ServerProps) {
  const role = user?.collection === 'users' ? (user.role as Role | undefined) : undefined
  const groups = visibleGroups(role)
  const name = (user?.name as string | undefined) || (user?.email as string | undefined) || ''
  return (
    <nav className="zp-nav" aria-label="Разделы админки">
      <div className="zp-nav__brand">
        <NavAutoOpen />
        <span className="zp-nav__logo">
          <BrandMark />
        </span>
        <div className="zp-nav__brand-text">
          <strong>зевспротект®</strong>
          <small className="zp-caps">CMS · админка</small>
        </div>
      </div>
      <div className="zp-nav__groups">
        <div className="zp-nav__group">
          <NavLink href="/admin" exact>
            <Icon d={ICONS.dashboard} />
            <span>Обзор</span>
          </NavLink>
        </div>
        {groups.map((g) => (
          <div key={g.title} className="zp-nav__group">
            <span className="zp-nav__title zp-caps">{g.title.toUpperCase()}</span>
            {g.items.map((i) => (
              <NavLink key={i.href} href={i.href}>
                <Icon d={ICONS[i.href.split('/').pop()!]} />
                <span>{i.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="zp-nav__footer">
        <div className="zp-nav__row">
          <a href="/" target="_blank" rel="noreferrer" className="zp-nav__item">
            <Icon d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />
            <span>Открыть сайт</span>
          </a>
          <ThemeToggle />
        </div>
        {user && (
          <div className="zp-nav__user">
            <span className="zp-nav__avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
            <div className="zp-nav__user-text">
              <strong>{name}</strong>
              {role && <small>{ROLE_LABEL[role]}</small>}
            </div>
            <a href="/admin/logout" className="zp-nav__logout" aria-label="Выйти">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </nav>
  )
}
