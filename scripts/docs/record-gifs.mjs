// Запись GIF-сценариев: Playwright recordVideo + видимый курсор → ffmpeg (палитра). Сервер: DOCS_BASE, БД zevs_docs.
//   node scripts/docs/record-gifs.mjs [имя …]   (без имён — все)
import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, readdirSync } from 'node:fs'
import { BASE, PASSWORD } from './lib.mjs'

const MEDIA = 'docs/user-guide/media'
const TMP = '/tmp/claude-1000/gif-tmp'
mkdirSync(MEDIA, { recursive: true })

const CURSOR = `(() => {
  try { localStorage.setItem('zp-cookies', '1') } catch {}
  const st = document.createElement('style'); st.textContent = 'nextjs-portal{display:none!important}'
  const addSt = () => document.documentElement.appendChild(st); document.documentElement ? addSt() : addEventListener('DOMContentLoaded', addSt)
  const d = document.createElement('div')
  d.style.cssText = 'position:fixed;z-index:2147483647;left:0;top:0;width:22px;height:22px;margin:-4px 0 0 -4px;pointer-events:none;border-radius:50%;background:rgba(255,106,0,.35);border:2px solid #ff6a00;transition:transform .05s'
  const hide = () => { for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (getComputedStyle(el).position === 'fixed' && r.left > innerWidth / 2 && r.top > innerHeight / 2 && !el.closest('[role=dialog]')) el.style.display = 'none' } }
  setInterval(hide, 100)
  const add = () => document.documentElement.appendChild(d)
  document.documentElement ? add() : addEventListener('DOMContentLoaded', add)
  addEventListener('mousemove', (e) => { d.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)' }, true)
  addEventListener('mousedown', () => { d.style.background = 'rgba(255,106,0,.8)' }, true)
  addEventListener('mouseup', () => { d.style.background = 'rgba(255,106,0,.35)' }, true)
})()`

/** Курсор плавно идёт к элементу и кликает; пауза после — чтобы зритель успел увидеть результат. */
async function tap(page, loc, after = 700) {
  const el = loc.first()
  await el.scrollIntoViewIfNeeded()
  const b = await el.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 22 })
  await page.waitForTimeout(250)
  await page.mouse.down(); await page.mouse.up()
  await page.waitForTimeout(after)
}
async function say(page, loc, text, delay = 55) {
  await tap(page, loc, 150)
  await page.keyboard.press('Control+A')
  await page.keyboard.type(text, { delay })
  await page.waitForTimeout(500)
}
const hideFloating = () => { for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (getComputedStyle(el).position === 'fixed' && r.left > innerWidth / 2 && r.top > innerHeight / 2 && !el.closest('[role=dialog]')) el.style.display = 'none' } }
const prep = async (page) => {
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
  await page.getByRole('button', { name: 'Понятно' }).click({ timeout: 1200 }).catch(() => {})
  await page.evaluate(`setInterval(${hideFloating}, 300)`)
}
const visit = async (page, url) => { await page.goto(url, { waitUntil: 'networkidle', timeout: 180_000 }); await prep(page); await page.waitForTimeout(600) }
async function adminLogin(page, email = 'docs-admin@example.test') {
  await visit(page, '/admin/login')
  await page.locator('input[name=email]').fill(email); await page.locator('input[name=password]').fill(PASSWORD)
  await page.locator('button[type=submit]').click(); await page.waitForURL(/\/admin(\/)?$/, { timeout: 90_000 }); await page.waitForLoadState('networkidle')
}

// auth: войти ДО записи (cookie уйдут в запись); warm: страницы, которые dev-сервер должен скомпилировать до записи
const META = {
  'g01-add-to-cart': { warm: ['/product/atlant', '/cart'] },
  'g02-volume-discount': { warm: ['/product/atlant'] },
  'g03-login': { warm: ['/login', '/account'] },
  'g04-track-order': { warm: ['/track'] },
  'g05-quick-order': { warm: ['/catalog'] },
  'g10-product-publish': { auth: 'admin', warm: ['/admin/collections/products'] },
  'g11-approve-review': { auth: 'admin', warm: ['/admin/collections/reviews'] },
  'g12-order-status': { auth: 'admin', warm: ['/admin/collections/orders'] },
}
const SCENES = {
  'g01-add-to-cart': async (page) => {
    await visit(page, '/product/atlant')
    await tap(page, page.locator('main').getByRole('button', { name: 'XL', exact: true }))
    await tap(page, page.getByRole('button', { name: 'В корзину' }), 1200)
    await tap(page, page.locator('a[href="/cart"]'), 2200)
  },
  'g02-volume-discount': async (page) => {
    await visit(page, '/product/atlant')
    const qty = page.getByRole('textbox', { name: 'Количество, пара' }).first()
    await say(page, qty, '1500'); await page.keyboard.press('Tab'); await page.waitForTimeout(1500)
    await say(page, qty, '3500'); await page.keyboard.press('Tab'); await page.waitForTimeout(1800)
  },
  'g03-login': async (page) => {
    await visit(page, '/login')
    await say(page, page.locator('input[type=email]'), 'docs-buyer@example.test', 35)
    await say(page, page.locator('input[type=password]'), PASSWORD, 35)
    await tap(page, page.locator('button[type=submit]').filter({ hasText: 'Войти' }), 500)
    await page.waitForURL('**/account**'); await page.waitForTimeout(2200)
  },
  'g04-track-order': async (page) => {
    await visit(page, '/track')
    const inputs = page.locator('main input:not([type=hidden])')
    await say(page, inputs.nth(0), 'ZP-2026-0003', 45)
    await say(page, inputs.nth(1), 'docs-buyer@example.test', 35)
    await tap(page, page.locator('main button[type=submit]'), 2500)
  },
  'g05-quick-order': async (page) => {
    await visit(page, '/catalog')
    await page.evaluate(() => window.scrollTo(0, 380)); await page.waitForTimeout(500)
    const card = page.getByRole('button', { name: 'Быстрый заказ' }).first()
    await page.mouse.move(700, 560, { steps: 15 }); await page.waitForTimeout(900)
    await tap(page, card, 1800)
  },
  'g10-product-publish': async (page) => {
    await visit(page, '/admin/collections/products')
    await tap(page, page.locator('table tbody tr a').first(), 1500)
    await tap(page, page.getByRole('button', { name: 'Цена и остатки' }), 800)
    await tap(page, page.getByRole('button', { name: 'Опубликовать изменения' }), 2500)
  },
  'g11-approve-review': async (page) => {
    await visit(page, '/admin/collections/reviews')
    await tap(page, page.locator('table tbody tr a').first(), 1500)
    await page.mouse.move(1200, 300, { steps: 20 }); await page.waitForTimeout(1200)
    await tap(page, page.getByRole('button', { name: 'Сохранить' }).first(), 2000)
  },
  'g12-order-status': async (page) => {
    await visit(page, '/admin/collections/orders')
    await tap(page, page.locator('table tbody tr a').first(), 1500)
    await tap(page, page.locator('.react-select').filter({ hasText: 'Принят' }), 900)
    await tap(page, page.getByRole('option', { name: 'Комплектуется' }), 800)
    await tap(page, page.getByRole('button', { name: 'Сохранить' }).first(), 2200)
  },
}

const want = process.argv.slice(2)
const names = want.length ? want : Object.keys(SCENES)
const browser = await chromium.launch()
for (const name of names) {
  const { auth, warm = [] } = META[name]
  // подготовка без записи: вход и компиляция страниц в dev
  const pre = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'ru-RU', baseURL: BASE })
  const pp = await pre.newPage(); pp.setDefaultTimeout(60_000)
  if (auth === 'admin') await adminLogin(pp)
  for (const url of warm) await pp.goto(url, { waitUntil: 'networkidle', timeout: 180_000 }).catch(() => {})
  const state = await pre.storageState(); await pre.close()

  rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'ru-RU', baseURL: BASE, storageState: state, recordVideo: { dir: TMP, size: { width: 1280, height: 720 } } })
  await context.addInitScript(CURSOR)
  const page = await context.newPage(); page.setDefaultTimeout(30_000)
  try { await SCENES[name](page); console.log('сцена ок', name) } catch (e) { console.warn('СЦЕНА УПАЛА', name, e.message.split('\n')[0]) }
  await context.close() // видео дописывается при закрытии
  const webm = readdirSync(TMP).find((f) => f.endsWith('.webm'))
  if (!webm) continue
  const pal = `${TMP}/pal.png`, vf = 'fps=10,scale=960:-1:flags=lanczos'
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.8', '-i', `${TMP}/${webm}`, '-vf', `${vf},palettegen=max_colors=96`, pal])
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.8', '-i', `${TMP}/${webm}`, '-i', pal, '-lavfi', `${vf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4`, `${MEDIA}/${name}.gif`])
  console.log('gif', `${MEDIA}/${name}.gif`)
}
await browser.close()
