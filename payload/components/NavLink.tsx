'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Пункт навигации с aria-current для текущего раздела (серверный Nav путь не знает).
export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: ReactNode }) {
  const path = usePathname()
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`)
  return (
    <Link href={href} className="zp-nav__item" aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  )
}
