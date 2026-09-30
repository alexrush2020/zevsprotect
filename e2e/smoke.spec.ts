import { expect } from "@playwright/test";
import { test, expectNoHorizontalScroll, watchConsole } from "./helpers";

/**
 * Сценарий 6: ключевые страницы открываются без ошибок в консоли; 404 на несуществующий slug;
 * нет горизонтального скролла на 375 / 768 / 1440. Скриншоты — screenshots/e2e/ (просматриваются глазами).
 */
const PAGES = [
  ["home", "/"],
  ["catalog", "/catalog"],
  ["product", "/product/atlant"],
  ["blog", "/blog"],
  ["post", "/blog/kak-vybrat-perchatki-dlya-sklada"],
  ["about", "/about"],
  ["contacts", "/contacts"],
  ["cart", "/cart"],
  ["checkout", "/checkout"],
  ["track", "/track"],
  ["login", "/login"],
] as const;

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];

for (const [name, path] of PAGES) {
  test(`smoke ${path}: 200, без ошибок консоли, без горизонтального скролла`, async ({ page }) => {
    // прогрев: первая загрузка в dev компилирует маршрут, гонки webpack-чанков при этом — шум dev-сервера
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const errors = watchConsole(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(300);
      await expectNoHorizontalScroll(page);
      await page.screenshot({ path: `screenshots/e2e/${name}-${vp.width}.png`, fullPage: vp.width !== 768 });
    }
    expect(errors).toEqual([]);
  });
}

for (const path of ["/product/e2e-net-takogo-tovara", "/blog/e2e-net-takoy-stati", "/e2e-net-takoy-stranicy"]) {
  test(`404 ${path}`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
  });
}
