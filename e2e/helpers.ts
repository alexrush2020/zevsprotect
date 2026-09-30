import pg from "pg";
import { test as base, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const BASE_URL = "http://localhost:43140";

/**
 * x-real-ip прогона — только на запросы к нашему серверу (сторонние, например карта Яндекса, падают на CORS
 * из-за лишнего заголовка). Лимиты заявок/заказов/трекинга считаются по IP в памяти dev-сервера:
 * новый прогон не упирается в лимиты предыдущего. Перехваты в тестах — через route.fallback(), чтобы дойти сюда.
 */
export async function withRunIp(context: BrowserContext) {
  await context.route(
    (url) => url.origin === BASE_URL,
    (route) => route.fallback({ headers: { ...route.request().headers(), "x-real-ip": process.env.E2E_IP! } }),
  );
  return context;
}

export const test = base.extend({
  context: async ({ context }, provide) => {
    await provide(await withRunIp(context));
  },
});

/** Отдельный «браузер» (свои cookie и localStorage) для второго клиента или гостя. */
export async function freshPage(browser: Browser) {
  const context = await withRunIp(await browser.newContext({ baseURL: BASE_URL }));
  return context.newPage(); // закрывать через page.context().close()
}

/** Маркер тестовых данных: email e2e-…@example.test, по нему же чистим. */
export const marker = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const emailOf = (m: string) => `${m}@example.test`;
const MARK_LIKE = "e2e-%@example.test";

/** Чтение/очистка тестовой БД. Только zevs_e2e — общую БД тесты не трогают ни при каких настройках. */
export async function sql<T extends pg.QueryResultRow = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const url = process.env.DATABASE_URL;
  if (!url || new URL(url).pathname !== "/zevs_e2e") throw new Error("E2E: DATABASE_URL должен указывать на zevs_e2e (запуск через обёртку e2e-run)");
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return (await c.query<T>(text, params)).rows;
  } finally {
    await c.end();
  }
}

/** Удалить строки, созданные тестами (заказы, заявки, клиенты с маркером). */
export async function cleanup() {
  await sql("delete from orders where guest_email like $1", [MARK_LIKE]);
  await sql("delete from leads where email like $1 or name like 'E2E %'", [MARK_LIKE]);
  await sql("delete from orders where customer_id in (select id from customers where email like $1)", [MARK_LIKE]);
  await sql("delete from customers where email like $1", [MARK_LIKE]);
}

export type OrderRow = { id: number; number: string; total: number; status: string; payment_method: string; customer_id: number | null; guest_email: string; consent_pd_at: Date | null };
export type ItemRow = { sku: string; title: string; size: string; coating: string | null; price: number; qty: number };

export async function orderByNumber(number: string) {
  const [order] = await sql<OrderRow>("select *, total::float8 as total from orders where number = $1", [number]);
  const items = order ? await sql<ItemRow>("select sku, title, size, coating, price::float8 as price, qty::float8 as qty from orders_items where _parent_id = $1 order by _order", [order.id]) : [];
  return { order, items };
}

/** Сумма, как её показывает formatPrice («28 833 ₽», «27,46 ₽») → число. */
export const money = (s: string) => Number(s.replace(/[^\d,]/g, "").replace(",", "."));

/** Ошибки консоли и необработанные исключения страницы. Пропуски картинок (медиа не загружены в zevs_e2e) — не дефект. */
export function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/Failed to load resource/.test(t) && /\/(api\/media|media|_next\/image)\//.test(m.location().url ?? "")) return;
    // товар без фото → <img src=""> (lib/server/map.ts: image = ""); дефект D-2 протокола, в сиде e2e фото не загружены
    if (/An empty string \(""\) was passed to the %s attribute/.test(t)) return;
    errors.push(t);
  });
  return errors;
}

/** Нет горизонтального скролла страницы. */
export async function expectNoHorizontalScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `scrollWidth ${scroll} > clientWidth ${client}`).toBeLessThanOrEqual(client);
}

/** Блок покупки на странице модели (ниже на странице — карточки похожих моделей со своими «В корзину»). */
export const buyBlock = (page: Page) =>
  page.getByRole("button", { name: "Оформить заказ" }).locator("xpath=ancestor::div[contains(@class,'space-y-4')][1]");

/** Добавить товар в корзину со страницы модели: qty вводом в «Количество», как покупатель. */
export async function addProductToCart(page: Page, slug: string, qty: number) {
  await page.goto(`/product/${slug}`);
  const input = buyBlock(page).getByLabel("Количество, пара").last();
  await input.fill(String(qty));
  await input.press("Enter");
  await buyBlock(page).getByRole("button", { name: "В корзину", exact: true }).click();
  await expect(page.getByText("Добавлено в корзину")).toBeVisible();
}

/** Контакты гостя, адрес и «Счёт от менеджера» на /checkout (после оформления — редирект на /order/…). */
export async function fillGuestCheckout(page: Page, email: string, m: string) {
  await page.fill("#name", `E2E ${m}`);
  await page.fill("#phone", "+7 900 000-00-00");
  await page.fill("#email", email);
  await page.fill("#company", "ООО «Тест E2E»");
  await page.getByPlaceholder("Город, улица, пункт выдачи или адрес…").fill("Ростов-на-Дону, ул. Тестовая, 1");
  await page.getByText("Счёт от менеджера", { exact: true }).click();
}
