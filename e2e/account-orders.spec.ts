import { expect, type Browser, type Page } from "@playwright/test";
import { test, freshPage, addProductToCart, cleanup, emailOf, marker, orderByNumber, sql } from "./helpers";

/**
 * Сценарий 3 (КП 10.1, 10.3): заказ клиента из корзины → виден в ЛК, карточка заказа, «Повторить заказ»
 * кладёт позиции в корзину; второй клиент и гость чужой заказ не видят (серверный access orders).
 */
test.describe.configure({ mode: "serial" });
test.afterAll(cleanup);

let number = "";
const password = "E2e-pass-1";
const customerA = { m: marker(), email: "" };
customerA.email = emailOf(customerA.m);

async function signedIn(browser: Browser, email: string, name: string): Promise<Page> {
  const page = await freshPage(browser);
  const create = await page.request.post("/api/customers", { data: { email, password, name, phone: "+7 900 111-22-33", kind: "person" } });
  if (!create.ok() && create.status() !== 400) throw new Error(`регистрация: ${create.status()}`);
  const login = await page.request.post("/api/customers/login", { data: { email, password } });
  expect(login.ok()).toBe(true);
  return page;
}

test("клиент оформляет заказ из корзины, заказ в ЛК", async ({ browser }) => {
  const page = await signedIn(browser, customerA.email, `E2E ${customerA.m}`);
  await addProductToCart(page, "atlant", 1030);
  await page.goto("/cart");
  await expect(page.locator("#order-email")).toHaveValue(customerA.email);
  await page.getByPlaceholder("Город, улица, пункт выдачи или адрес…").fill("Таганрог, ул. Клиентская, 5");
  await page.getByRole("button", { name: "Оформить заказ" }).click();
  await page.waitForURL(/\/invoice\/ZP-\d{4}-\d{4,}$/);
  number = page.url().split("/").pop()!;

  const { order, items } = await orderByNumber(number);
  expect(order.customer_id).not.toBeNull();
  expect(order.payment_method).toBe("invoice_auto");
  expect(order.total).toBe(28833);
  expect(items.map((i) => [i.title, i.qty, i.price])).toEqual([["Перчатки «Атлант»", 1050, 27.46]]);
  // QA-D1: у ручного адреса поля города нет — фиктивный город по умолчанию в заказ не пишется
  const [delivery] = await sql<{ city: string | null; address: string }>(
    "select delivery_city as city, delivery_address as address from orders where number = $1",
    [number],
  );
  expect(delivery).toEqual({ city: null, address: "Таганрог, ул. Клиентская, 5" });

  await page.goto("/account/orders");
  const card = page.locator("div.rounded-2xl").filter({ has: page.getByRole("link", { name: number }) });
  await expect(card).toBeVisible();
  await expect(card.getByText(/28\s833\s₽/)).toBeVisible();
  await expect(card.getByText("Перчатки «Атлант» × 1050 пар")).toBeVisible();
  await expect(card.getByText("СДЭК", { exact: true })).toBeVisible(); // без «· город»
  await expect(card.getByText(/Ростов-на-Дону/)).toHaveCount(0);

  await card.getByRole("link", { name: number }).click();
  await page.waitForURL(new RegExp(`/order/${number}$`));
  await expect(page.getByRole("heading", { name: number })).toBeVisible();
  await expect(page.getByText(/Перчатки «Атлант» · L · × 1050 пар/)).toBeVisible();
  await page.context().close();
});

test("«Повторить заказ» кладёт позиции заказа в корзину", async ({ browser }) => {
  const page = await signedIn(browser, customerA.email, `E2E ${customerA.m}`);
  await page.goto("/account/orders");
  const card = page.locator("div.rounded-2xl").filter({ has: page.getByRole("link", { name: number }) });
  await card.getByRole("button", { name: "Повторить заказ" }).click();
  await page.waitForURL(/\/cart$/);
  await expect(page.getByText("Состав заказа в корзине")).toBeVisible();
  await expect(page.getByText("Перчатки «Атлант»").first()).toBeVisible();
  await expect(page.getByText("1050 пар")).toBeVisible();
  await expect(page.getByText("Итого к оплате").locator("xpath=following-sibling::p[1]")).toHaveText(/28\s833\s₽/);
  await page.context().close();
});

test("второй клиент и гость не видят чужой заказ", async ({ browser }) => {
  const m = marker();
  const page = await signedIn(browser, emailOf(m), `E2E ${m}`);
  await page.goto("/account/orders");
  await expect(page.getByText("Заказов пока нет.")).toBeVisible();
  await expect(page.getByText(number)).toHaveCount(0);

  await page.goto(`/order/${number}`);
  await expect(page.getByRole("heading", { name: "Заказ не найден" })).toBeVisible();
  await page.goto(`/invoice/${number}`);
  await expect(page.getByRole("heading", { name: "Счёт не найден" })).toBeVisible();

  // REST под сессией второго клиента: access коллекции отдаёт только свои заказы
  const res = await page.request.get(`/api/orders?where[number][equals]=${number}`);
  expect(res.ok()).toBe(true);
  expect((await res.json()).docs).toHaveLength(0);
  await page.context().close();

  const guest = await freshPage(browser);
  await guest.goto(`/order/${number}`);
  await expect(guest.getByRole("heading", { name: "Заказ не найден" })).toBeVisible();
  const anon = await guest.request.get(`/api/orders?where[number][equals]=${number}`);
  expect(anon.ok() ? (await anon.json()).docs.length : 0).toBe(0);
  await guest.context().close();
});
