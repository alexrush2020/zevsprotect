'use client'
import { useNav, usePreferences } from '@payloadcms/ui'
import { useEffect } from 'react'

// Payload сворачивает меню на всех экранах ≤ 1440px, т.е. на большинстве ноутбуков.
// Где меню не модальное (> 1024px), открываем его, если пользователь сам не закрыл (preference nav.open).
export function NavAutoOpen() {
  const { hydrated, setNavOpen } = useNav()
  const { getPreference } = usePreferences()
  useEffect(() => {
    if (!hydrated || !window.matchMedia('(min-width: 1025px) and (max-width: 1440px)').matches) return
    void getPreference<{ open?: boolean }>('nav').then((p) => {
      if (p?.open !== false) setNavOpen(true)
    })
  }, [hydrated, getPreference, setNavOpen])
  return null
}
