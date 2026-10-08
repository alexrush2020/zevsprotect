// Общее для съёмки документации: браузер, вход, снимок с догрузкой lazy-картинок.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

export const BASE = process.env.DOCS_BASE ?? 'http://localhost:43141'
export const PASSWORD = 'Docs-Demo-2026!'
export const OUT = 'docs/user-guide/img'
mkdirSync(OUT, { recursive: true })

export async function open(viewport = { width: 1280, height: 800 }) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport, locale: 'ru-RU', baseURL: BASE, deviceScaleFactor: 1 })
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  return { browser, context, page }
}

export async function go(page, route, { chat = false } = {}) {
  await page.goto(route, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.addStyleTag({ content: 'nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none!important}' })
  await page.getByRole('button', { name: 'Понятно' }).click({ timeout: 1500 }).catch(() => {}) // баннер cookie
  if (!chat) await hideChat(page)
}

/** Плавающий виджет «Анна · менеджер» и кнопка «наверх» закрывают угол кадра — в обычных снимках скрываем. */
export async function hideChat(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el)
      if (cs.position === 'fixed' && el.getBoundingClientRect().left > innerWidth / 2 && el.getBoundingClientRect().top > innerHeight / 2) el.style.display = 'none'
    }
  })
}

/** Снимок: viewport (по умолчанию), fullPage или элемент. Ошибка шага не роняет весь прогон. */
export async function shot(page, name, { full = false, el, clip } = {}) {
  try {
    await page.waitForTimeout(500)
    const path = `${OUT}/${name}.png`
    if (el) await page.locator(el).first().screenshot({ path })
    else await page.screenshot({ path, fullPage: full, clip })
    console.log('ok  ', name)
  } catch (e) {
    console.warn('FAIL', name, e.message.split('\n')[0])
  }
}

export async function step(name, fn) {
  try { await fn() } catch (e) { console.warn('FAIL step', name, e.message.split('\n')[0]) }
}
