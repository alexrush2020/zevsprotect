import { expect } from "@playwright/test";
import { test, freshPage, buyBlock, cleanup, emailOf, fillGuestCheckout, marker, money, orderByNumber, sql } from "./helpers";

/**
 * Сценарий 1 (КП 10.1): каталог → карточка → корзина (сумма, НДС, минимум/кратность, скидка по объёму) →
 * оформление гостем на /checkout → /order/ZP-… → заказ в БД со снапшотом цен, total = сумма корзины.
 * «Атлант»: 28,90 ₽, минимум 200, шаг упаковки 50 (ПВХ), от 1000 пар −5% → 27,46 ₽.
 */
const SLUG = "atlant";
const NAME = "Перчатки «Атлант»";

test.afterAll(cleanup);

test("гость: каталог → корзина → оформление → заказ в БД со снапшотом", async ({ page }) => {
  const m = marker();
  const email = emailOf(m);

  await page.goto("/catalog");
  await page.getByRole("link", { name: NAME, exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/product/${SLUG}$`));

  const buy = buyBlock(page);
  await expect(buy.getByText("Минимум 200 пар")).toBeVisible();
  const qty = buy.getByLabel("Количество, пара").last();
  // ниже минимума → поднимается до минимума
  await qty.fill("120");
  await qty.press("Enter");
  await expect(qty).toHaveValue("200");
  // не кратно упаковке → округление вверх до шага 50
  await qty.fill("1030");
  await qty.press("Enter");
  await expect(qty).toHaveValue("1050");
  await buy.getByRole("button", { name: "В корзину", exact: true }).click();
  await expect(page.getByText("Добавлено в корзину")).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Корзина" })).toBeVisible();
  // трекер скидки: 1050 пар → −5%, 27,46 ₽/пара; 1050 × 27,46 = 28 833 ₽
  await expect(page.getByText("27,46 ₽ / пара")).toBeVisible();
  await expect(page.getByText("ещё 1950 пар до −7%")).toBeVisible();
  await expect(page.getByText("НДС 20% включён")).toBeVisible();
  const cartTotal = money(await page.getByText("Итого к оплате").locator("xpath=following-sibling::p[1]").innerText());
  expect(cartTotal).toBe(28833);

  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Оформление заказа" })).toBeVisible();
  await expect(page.getByText("в т.ч. НДС 20% 4 805,50 ₽")).toBeVisible();
  await fillGuestCheckout(page, email, m);
  await page.getByRole("button", { name: /Подтвердить заказ · 28 833/ }).click();

  await page.waitForURL(/\/order\/ZP-\d{4}-\d{4,}$/);
  const number = page.url().split("/").pop()!;
  await expect(page.getByRole("heading", { name: number })).toBeVisible();
  await expect(page.getByText(/Перчатки «Атлант» · L · × 1050 пар/)).toBeVisible();

  const { order, items } = await orderByNumber(number);
  expect(order).toBeTruthy();
  expect(order.customer_id).toBeNull();
  expect(order.guest_email).toBe(email);
  expect(order.payment_method).toBe("invoice_manager");
  expect(order.status).toBe("accepted");
  expect(order.consent_pd_at).not.toBeNull();
  expect(order.total).toBe(cartTotal);
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ title: NAME, size: "L", qty: 1050 });
  expect(items[0].price).toBe(27.46);

  // корзина очищена после заказа
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Корзина пуста" })).toBeVisible();

  // чужой браузер без cookie заказа номер не открывает
  const other = await freshPage(page.context().browser()!);
  await other.goto(`/order/${number}`);
  await expect(other.getByRole("heading", { name: "Заказ не найден" })).toBeVisible();
  await other.context().close();
});

test("подмена цены/количества в запросе не влияет на заказ: сервер пересчитывает по каталогу", async ({ page }) => {
  const m = marker();
  const email = emailOf(m);
  const buy = buyBlock(page);
  await page.goto(`/product/${SLUG}`);
  await buy.getByRole("button", { name: "В корзину", exact: true }).click();
  await page.goto("/checkout");
  await fillGuestCheckout(page, email, m);

  // перехват server action createOrder: цена 1 ₽, итог 1 ₽, qty не кратно упаковке
  await page.route("**/checkout", async (route) => {
    const req = route.request();
    const body = req.postData() ?? "";
    if (req.method() !== "POST" || !req.headers()["next-action"] || !body.includes('"token"')) return route.fallback();
    const args = JSON.parse(body) as [{ items: Record<string, unknown>[] } & Record<string, unknown>];
    args[0].items = args[0].items.map((i) => ({ ...i, qty: 201, price: 1, unitPrice: 1, total: 1 }));
    args[0].total = 1;
    return route.fallback({ postData: JSON.stringify(args) });
  });
  await page.getByRole("button", { name: /Подтвердить заказ/ }).click();
  await page.waitForURL(/\/order\/ZP-/);
  const { order, items } = await orderByNumber(page.url().split("/").pop()!);
  // 201 → 250 (шаг 50), цена каталога 28,90 без скидки: 250 × 28,90 = 7225
  expect(items[0].qty).toBe(250);
  expect(items[0].price).toBe(28.9);
  expect(order.total).toBe(7225);
});

test("без согласия на ПДн: форма не уходит, сервер отказывает при обходе", async ({ page }) => {
  const m = marker();
  const email = emailOf(m);
  await page.goto(`/product/${SLUG}`);
  await buyBlock(page).getByRole("button", { name: "В корзину", exact: true }).click();
  await page.goto("/checkout");
  await fillGuestCheckout(page, email, m);

  // браузер не отправит форму со снятым обязательным согласием
  await page.getByText("Согласен с политикой обработки персональных данных").click();
  let sent = false;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.headers()["next-action"] && (r.postData() ?? "").includes('"token"')) sent = true;
  });
  await page.getByRole("button", { name: /Подтвердить заказ/ }).click();
  await page.waitForTimeout(1000);
  expect(sent).toBe(false);

  // обход клиента: согласие отмечено в UI, но в запросе consent=false → сервер отказывает
  await page.getByText("Согласен с политикой обработки персональных данных").click();
  await page.route("**/checkout", async (route) => {
    const req = route.request();
    const body = req.postData() ?? "";
    if (req.method() !== "POST" || !req.headers()["next-action"] || !body.includes('"token"')) return route.fallback();
    const args = JSON.parse(body) as [Record<string, unknown>];
    args[0].consent = false;
    return route.fallback({ postData: JSON.stringify(args) });
  });
  await page.getByRole("button", { name: /Подтвердить заказ/ }).click();
  await expect(page.getByText("Нужно согласие на обработку персональных данных")).toBeVisible();
  await expect(page).toHaveURL(/\/checkout$/);
  expect(await sql("select id from orders where guest_email = $1", [email])).toHaveLength(0);
});
