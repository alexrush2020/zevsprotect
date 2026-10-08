// Скриншоты админки для раздела «Менеджерам». Сервер: DOCS_BASE, БД zevs_docs.
import { open, go, shot, step, PASSWORD } from './lib.mjs'

async function login(page, email) {
  await go(page, '/admin/login')
  await page.locator('input[name=email]').fill(email)
  await page.locator('input[name=password]').fill(PASSWORD)
  await page.locator('button[type=submit]').click()
  await page.waitForURL(/\/admin(\/)?$/, { timeout: 90_000 })
  await page.waitForLoadState('networkidle')
}
const adm = async (page, route) => { await page.goto(route, { waitUntil: 'networkidle', timeout: 180_000 }); await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await page.waitForTimeout(800) }

const { browser, page } = await open({ width: 1440, height: 900 })
await go(page, '/admin/login'); await shot(page, 'a01-login')
await login(page, 'docs-admin@example.test')
await shot(page, 'a02-dashboard')

const pages = [
  ['a03-products', '/admin/collections/products'], ['a07-categories', '/admin/collections/categories'],
  ['a08-media', '/admin/collections/media'], ['a09-reviews', '/admin/collections/reviews'],
  ['a10-posts', '/admin/collections/posts'], ['a12-home', '/admin/globals/home'], ['a13-about', '/admin/globals/about'],
  ['a14-delivery', '/admin/globals/delivery'], ['a15-settings', '/admin/globals/settings'],
  ['a16-orders', '/admin/collections/orders'], ['a18-leads', '/admin/collections/leads'],
  ['a19-customers', '/admin/collections/customers'], ['a20-users', '/admin/collections/users'],
]
for (const [n, r] of pages) await step(n, async () => { await adm(page, r); await shot(page, n) })

await step('product-edit', async () => {
  await adm(page, '/admin/collections/products')
  await page.locator('table tbody tr a').first().click()
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(1000)
  await shot(page, 'a04-product-main')
  for (const [tab, n] of [['Характеристики', 'a05a-product-specs'], ['Фото и документы', 'a05b-product-media'], ['Цена и остатки', 'a05c-product-price'], ['SEO', 'a05d-product-seo']]) {
    await page.getByRole('button', { name: tab }).first().click().catch(() => {}); await shot(page, n)
  }
  await shot(page, 'a06-product-full', { full: true })
})
await step('order-edit', async () => {
  await adm(page, '/admin/collections/orders')
  await page.locator('table tbody tr a').first().click()
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(1000)
  await shot(page, 'a17-order'); await shot(page, 'a17a-order-full', { full: true })
})
await step('review-edit', async () => {
  await adm(page, '/admin/collections/reviews')
  await page.locator('table tbody tr a').first().click()
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(1000); await shot(page, 'a09a-review')
})
await step('lead-edit', async () => {
  await adm(page, '/admin/collections/leads')
  await page.locator('table tbody tr a').first().click()
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(1000); await shot(page, 'a18a-lead')
})
await step('create-product', async () => { await adm(page, '/admin/collections/products/create'); await shot(page, 'a03a-product-create') })
await step('media-upload', async () => { await adm(page, '/admin/collections/media/create'); await shot(page, 'a08a-media-create') })
await page.context().clearCookies()

for (const [email, n] of [['docs-manager@example.test', 'a21-role-manager'], ['docs-content@example.test', 'a22-role-content']]) {
  await step(n, async () => { await login(page, email); await shot(page, n); await page.context().clearCookies() })
}
await browser.close()
