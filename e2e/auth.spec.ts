import { expect, type Page } from "@playwright/test";
import { test, cleanup, emailOf, marker, sql } from "./helpers";

/** Сценарий 2 (КП 10.1): регистрация → вход → выход → сброс пароля по ссылке → вход с новым паролем. */
test.afterAll(cleanup);

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#auth-email", email);
  await page.fill("#auth-password", password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
}

test("регистрация, вход, выход, сброс пароля, повторный вход", async ({ page }) => {
  const m = marker();
  const email = emailOf(m);
  const password = "E2e-pass-1";
  const newPassword = "E2e-pass-2";

  await page.goto("/register");
  await page.getByRole("button", { name: "Частное лицо" }).click();
  await page.fill("#auth-name", `E2E ${m}`);
  await page.fill("#auth-phone", "9000000000");
  await page.fill("#auth-reg-email", email);
  await page.fill("#auth-reg-password", password);
  await page.getByRole("button", { name: "Создать кабинет" }).click();
  await page.waitForURL(/\/account$/);
  await expect(page.getByRole("button", { name: "Выйти" })).toBeVisible();

  const [row] = await sql<{ kind: string; name: string }>("select kind, name from customers where email = $1", [email]);
  expect(row).toMatchObject({ kind: "person", name: `E2E ${m}` });

  // выход: кнопка пропадает, cookie сессии снята
  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page.getByRole("button", { name: "Выйти" })).toHaveCount(0);
  expect((await page.context().cookies()).some((c) => c.name === "payload-token")).toBe(false);

  // неверный пароль → отказ, верный → кабинет
  await login(page, email, "wrong-password");
  await expect(page.getByText("Неверный email или пароль")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await page.fill("#auth-password", password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL(/\/account$/);
  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page.getByRole("button", { name: "Выйти" })).toHaveCount(0);

  // сброс пароля: ответ одинаковый, токен — из БД (письмо в dev пишется в консоль сервера)
  await page.goto("/forgot");
  await page.fill("#forgot-email", email);
  await page.getByRole("button", { name: "Отправить ссылку" }).click();
  await expect(page.getByText(`Если кабинет с адресом ${email} существует`)).toBeVisible();
  const [{ reset_password_token: token }] = await sql<{ reset_password_token: string | null }>(
    "select reset_password_token from customers where email = $1",
    [email],
  );
  expect(token).toBeTruthy();

  await page.goto("/forgot/reset?token=bad-token");
  await page.fill("#password", newPassword);
  await page.fill("#repeat", newPassword);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Ссылка недействительна или устарела")).toBeVisible();

  await page.goto(`/forgot/reset?token=${token}`);
  await page.fill("#password", newPassword);
  await page.fill("#repeat", newPassword);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Пароль обновлён. Войдите с новым паролем.")).toBeVisible();

  // сброс мог сразу залогинить — выходим, чтобы проверить вход новым паролем
  await page.context().clearCookies();
  await login(page, email, password);
  await expect(page.getByText("Неверный email или пароль")).toBeVisible();
  await page.fill("#auth-password", newPassword);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL(/\/account$/);
  await expect(page.getByRole("button", { name: "Выйти" })).toBeVisible();
});

test("регистрация на занятый email — отказ без второй записи", async ({ page, request }) => {
  const m = marker();
  const email = emailOf(m);
  const res = await request.post("/api/customers", { data: { email, password: "E2e-pass-1", name: `E2E ${m}`, kind: "person" } });
  expect(res.ok()).toBe(true);

  await page.goto("/register");
  await page.getByRole("button", { name: "Частное лицо" }).click();
  await page.fill("#auth-name", `E2E ${m}`);
  await page.fill("#auth-reg-email", email);
  await page.fill("#auth-reg-password", "E2e-pass-9");
  await page.getByRole("button", { name: "Создать кабинет" }).click();
  await expect(page.getByText("Не удалось создать кабинет")).toBeVisible();
  expect(await sql("select id from customers where email = $1", [email])).toHaveLength(1);
});
