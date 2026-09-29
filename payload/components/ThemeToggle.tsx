'use client'
import { useTheme } from '@payloadcms/ui'

// Переключатель светлой/тёмной темы: useTheme сам пишет cookie payload-theme и html[data-theme].
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className="zp-theme-toggle"
      aria-label="Переключить тему"
      aria-pressed={dark}
      title={dark ? 'Светлая тема' : 'Тёмная тема'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark ? (
          <path d="M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        ) : (
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        )}
      </svg>
    </button>
  )
}
