import { expect, type Page } from "@playwright/test";
import { test, freshPage, addProductToCart, cleanup, emailOf, fillGuestCheckout, marker } from "./helpers";

/** Сценарий 5 (CONTRA-1): /track по паре номер + email; неверная пара и несуществующий номер — один ответ. */
test.afterAll(cleanup);

const NOT_FOUND = "Заказ с таким номером и email не найден";

async function track(page: Page, number: string, email: string) {
  await page.goto("/track");
  await page.fill("#id", number);
  await page.fill("#email", email);
  await page.getByRole("button", { name: "Найти" }).click();
}

test("/track: верная пара — статус без ПДн, неверная — «не найден» одинаково", async ({ page, browser }) => {
  const m = marker();
  const email = emailOf(m);
  await addProductToCart(page, "atlant", 200);
  await page.goto("/checkout");
  await fillGuestCheckout(page, email, m);
  await page.getByRole("button", { name: /Подтвердить заказ/ }).click();
  await page.waitForURL(/\/order\/ZP-/);
  const number = page.url().split("/").pop()!;

  // другой браузер: ни cookie заказа, ни localStorage — только сервер
  const other = await freshPage(browser);
  // регистр номера и email не важен
  await track(other, number.toLowerCase(), email.toUpperCase());
  const card = other.locator('div[aria-live="polite"]');
  await expect(card.getByText(number)).toBeVisible();
  await expect(card.getByText(/Заказ принят/).first()).toBeVisible();
  await expect(card.getByText(/Перчатки «Атлант» · L/)).toBeVisible();
  // без ПДн: имя, телефон, компания, адрес не показываются
  const text = await card.innerText();
  for (const pii of [`E2E ${m}`, "900 000-00-00", "Тест E2E", "Тестовая"]) expect(text).not.toContain(pii);

  // role=alert формы (у Next есть свой route announcer с той же ролью)
  const alert = other.locator('form [role="alert"]');
  await track(other, number, emailOf(marker()));
  await expect(alert).toContainText(NOT_FOUND);
  const wrongEmail = await alert.innerText();

  await track(other, "ZP-2099-9999", email);
  await expect(alert).toHaveText(wrongEmail);
  await expect(other.locator('div[aria-live="polite"]')).toHaveCount(0);
  await other.context().close();
});
