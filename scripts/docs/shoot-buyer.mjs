// Скриншоты для раздела «Покупателям». Сервер: DOCS_BASE (по умолчанию http://localhost:43141, БД zevs_docs).
import { open, go, shot, step, PASSWORD } from './lib.mjs'

const { browser, page, context } = await open()

for (const [n, route, full] of [
  ['b01-home', '/', false], ['b02-catalog', '/catalog', false], ['b20-delivery', '/delivery', false],
  ['b21-contacts', '/contacts', false], ['b22-blog', '/blog', false], ['b23-calculation', '/calculation', false],
  ['b24-samples', '/samples', false], ['b25-price', '/price', false], ['b26-track', '/track', false], ['b27-about', '/about', false],
]) await step(n, async () => { await go(page, route); await shot(page, n, { full }) })

await step('catalog-details', async () => {
  await go(page, '/catalog')
  await page.evaluate(() => window.scrollTo(0, 380))
  await page.getByRole('button', { name: 'Избранное' }).first().hover().catch(() => {})
  await shot(page, 'b03-catalog-hover')
  await page.getByRole('button', { name: 'Быстрый заказ' }).first().click().catch(() => {})
  await shot(page, 'b04-catalog-quick')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /ГИД ЗАКУПЩИКА/i }).click()
  await shot(page, 'b05-buyer-guide')
  await page.keyboard.press('Escape')
})

await step('product', async () => {
  await go(page, '/product/atlant')
  await shot(page, 'b06-product')
  await page.locator('main').getByRole('button', { name: 'L', exact: true }).first().click()
  await shot(page, 'b07-product-full', { full: true })
  await page.getByRole('button', { name: /Уточнить наличие/ }).click()
  await shot(page, 'b08-product-ask')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'В корзину' }).first().click()
  await page.waitForTimeout(800)
  await shot(page, 'b09-product-added')
})

await step('cart', async () => { await go(page, '/cart'); await shot(page, 'b10-cart') })

await step('auth', async () => {
  await go(page, '/login'); await shot(page, 'b11-login')
  await page.getByRole('button', { name: 'Регистрация' }).click(); await shot(page, 'b12-register')
  await page.getByRole('button', { name: 'Вход' }).click()
  await page.getByRole('button', { name: 'Забыли пароль?' }).click(); await shot(page, 'b13-forgot')
})

await step('login', async () => {
  await go(page, '/login')
  await page.locator('input[type=email]').fill('docs-buyer@example.test')
  await page.locator('input[type=password]').fill(PASSWORD)
  await page.locator('button[type=submit]').filter({ hasText: 'Войти' }).click()
  await page.waitForURL('**/account**', { timeout: 60_000 })
})

for (const [n, route] of [['b14-account', '/account'], ['b15-orders', '/account/orders'], ['b16-profile', '/account/profile'],
  ['b17-favorites', '/account/favorites'], ['b18-notifications', '/account/notifications']])
  await step(n, async () => { await go(page, route); await shot(page, n) })

await step('checkout', async () => {
  await go(page, '/checkout'); await shot(page, 'b19-checkout', { full: true })
})
await context.storageState({ path: '/tmp/claude-1000/x/buyer-state.json' })
await browser.close()

// мобильная версия
const m = await open({ width: 375, height: 812 })
for (const [n, route] of [['m01-home', '/'], ['m02-catalog', '/catalog'], ['m03-product', '/product/atlant']])
  await step(n, async () => { await go(m.page, route); await shot(m.page, n) })
await m.browser.close()
