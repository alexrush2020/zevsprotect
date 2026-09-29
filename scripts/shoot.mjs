// Скриншоты страниц на трёх ширинах: эталон прототипа и локальная сборка снимаются одинаково.
// node scripts/shoot.mjs <baseUrl> <outDir> [route ...]
//   node scripts/shoot.mjs https://zevsprotect-prototype.vercel.app docs/prototype/screens
//   node scripts/shoot.mjs http://localhost:3000 screenshots/local / /catalog
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const [base, out, ...args] = process.argv.slice(2)
if (!base || !out) {
  console.error('usage: node scripts/shoot.mjs <baseUrl> <outDir> [route ...]')
  process.exit(1)
}
const ROUTES = args.length
  ? args
  : ['/', '/about', '/catalog', '/product/atlant', '/cart', '/checkout', '/login', '/register', '/account',
     '/calculation', '/price', '/samples', '/delivery', '/track', '/contacts', '/blog',
     '/blog/nalichie-siz-v-rossii', '/privacy', '/admin']
const WIDTHS = { desktop: [1440, 900], tablet: [768, 1024], mobile: [375, 812] }

mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
for (const [name, [width, height]] of Object.entries(WIDTHS)) {
  const page = await browser.newPage({ viewport: { width, height } })
  for (const route of ROUTES) {
    await page.goto(base + route, { waitUntil: 'networkidle', timeout: 90_000 }).catch((e) => console.warn(route, e.message))
    // догрузить lazy-картинки и анимации появления
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)) }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(400)
    const file = `${out}/${(route === '/' ? 'home' : route.slice(1).replaceAll('/', '_'))}.${name}.jpg`
    await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 85 })
    console.log(file)
  }
  await page.close()
}
await browser.close()
