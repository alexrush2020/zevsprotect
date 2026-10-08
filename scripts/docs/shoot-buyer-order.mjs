// Сквозной сценарий покупателя: вход → корзина → заказ → кабинет. Создаёт заказ в БД zevs_docs.
import { open, go, shot, step, PASSWORD } from './lib.mjs'

const { browser, page } = await open()
await go(page, '/login')
await page.locator('input[type=email]').fill('docs-buyer@example.test')
await page.locator('input[type=password]').fill(PASSWORD)
await page.locator('button[type=submit]').filter({ hasText: 'Войти' }).click()
await page.waitForURL('**/account**', { timeout: 60_000 })

await step('add', async () => {
  await go(page, '/product/atlant')
  await page.locator('main').getByRole('button', { name: 'L', exact: true }).first().click()
  await page.getByRole('button', { name: 'В корзину' }).first().click()
  await page.waitForTimeout(800)
})
await step('cart', async () => {
  await go(page, '/cart')
  await shot(page, 'b10-cart')
  await page.evaluate(() => window.scrollTo(0, 560)); await shot(page, 'b10a-cart-form')
  await page.evaluate(() => window.scrollTo(0, 1500)); await shot(page, 'b10b-cart-payment')
})
await step('submit', async () => {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Оформить заказ' }).click()
  await page.waitForURL(/\/(order|invoice)\//, { timeout: 60_000 })
  await page.waitForTimeout(1500)
  console.log('заказ:', page.url())
  await shot(page, 'b30-order-done', { full: true })
})
for (const [n, route] of [['b15-orders', '/account/orders'], ['b14-account', '/account']]) await step(n, async () => { await go(page, route); await shot(page, n) })
await step('order-card', async () => {
  await go(page, '/account/orders')
  await page.locator('a[href^="/order/"]').first().click()
  await page.waitForLoadState('networkidle'); await shot(page, 'b31-order-card', { full: true })
})
await browser.close()
