import { expect, type Locator, type Page } from "@playwright/test";
import { test, cleanup, emailOf, marker, sql } from "./helpers";

/**
 * Сценарий 4 (КП 10.1): формы витрины → leads нужного типа. Без согласия — отказ (браузер не отправляет,
 * сервер отказывает при обходе клиента), honeypot заполнен — «успех» без записи.
 */
test.afterAll(cleanup);

type Form = {
  name: string;
  type: string;
  /** Открыть форму и вернуть её контейнер. */
  open: (page: Page) => Promise<Locator>;
  /** Поля сверх общих (имя, телефон, email, сообщение). */
  extra?: Record<string, string>;
  submit: string;
  success: RegExp;
};

const FORMS: Form[] = [
  {
    name: "контакты (feedback)",
    type: "feedback",
    open: async (page) => {
      await page.goto("/contacts");
      return page.locator("form").filter({ has: page.getByRole("button", { name: "Отправить", exact: true }) });
    },
    submit: "Отправить",
    success: /Сообщение отправлено/,
  },
  {
    name: "расчёт партии (lead-form, calculation)",
    type: "calculation",
    open: async (page) => {
      await page.goto("/calculation");
      return page.locator("form").filter({ hasText: "Заявка на расчёт" });
    },
    extra: { city: "Ростов-на-Дону", volume: "5000 пар" },
    submit: "Отправить",
    success: /Заявка \d* ?принята/,
  },
  {
    name: "образцы (lead-form, samples)",
    type: "samples",
    open: async (page) => {
      await page.goto("/samples");
      return page.locator("form").filter({ hasText: "Заявка на образцы" });
    },
    extra: { models: "Атлант", city: "Таганрог" },
    submit: "Отправить",
    success: /Заявка \d* ?принята/,
  },
  {
    name: "диалог «Рассчитать поставку» в шапке (inquiry-dialog)",
    type: "calculation",
    open: async (page) => {
      await page.goto("/");
      return openDialog(page, "Рассчитать поставку");
    },
    submit: "Отправить заявку",
    success: /Заявка принята/,
  },
  {
    name: "диалог «Запросить прайс-лист» (inquiry-dialog, pricelist)",
    type: "pricelist",
    open: async (page) => {
      await page.goto("/contacts");
      return openDialog(page, "Или запросить прайс-лист");
    },
    submit: "Отправить заявку",
    success: /Заявка принята/,
  },
];

/** Клик до гидратации диалог не открывает — повторяем, пока не откроется. */
async function openDialog(page: Page, trigger: string) {
  const dialog = page.getByRole("dialog");
  await expect(async () => {
    await page.getByRole("button", { name: trigger }).first().click();
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  return dialog;
}

async function fill(form: Locator, f: Form, m: string) {
  await form.locator('[name="name"]').fill(`E2E ${m}`);
  await form.locator('[name="phone"]').fill("+7 900 000-00-00");
  await form.locator('[name="email"]').fill(emailOf(m));
  await form.locator('[name="message"]').fill(`Тест ${m}`);
  for (const [k, v] of Object.entries(f.extra ?? {})) await form.locator(`[name="${k}"]`).fill(v);
}

const leadsOf = (m: string) => sql<{ type: string; name: string; data: Record<string, string> | null; consent_pd_at: Date | null }>(
  "select type, name, data, consent_pd_at from leads where email = $1",
  [emailOf(m)],
);

for (const f of FORMS) {
  test.describe(f.name, () => {
    test("успех создаёт лид нужного типа", async ({ page }) => {
      const m = marker();
      const form = await f.open(page);
      await fill(form, f, m);
      await form.getByRole("button", { name: f.submit, exact: true }).click();
      await expect(page.getByText(f.success).first()).toBeVisible();
      const rows = await leadsOf(m);
      expect(rows).toHaveLength(1);
      expect(rows[0].type).toBe(f.type);
      expect(rows[0].consent_pd_at).not.toBeNull();
      for (const [k, v] of Object.entries(f.extra ?? {})) expect(rows[0].data?.[k]).toBe(v);
    });

    test("без согласия — отказ, лид не создан", async ({ page }) => {
      const m = marker();
      const form = await f.open(page);
      await fill(form, f, m);
      // снятое обязательное согласие: браузер форму не отправляет
      await form.getByRole("checkbox").click();
      await form.getByRole("button", { name: f.submit, exact: true }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText(f.success)).toHaveCount(0);

      // обход клиента: согласие в запросе пустое → сервер отказывает
      await form.getByRole("checkbox").click();
      await page.route("**/*", async (route) => {
        const req = route.request();
        const body = req.postData() ?? "";
        if (req.method() !== "POST" || !req.headers()["next-action"] || !body.includes('"consent"')) return route.fallback();
        const args = JSON.parse(body) as [string, Record<string, string>];
        args[1].consent = "";
        return route.fallback({ postData: JSON.stringify(args) });
      });
      await form.getByRole("button", { name: f.submit, exact: true }).click();
      await expect(page.getByText("Нужно согласие на обработку персональных данных")).toBeVisible();
      expect(await leadsOf(m)).toHaveLength(0);
    });

    test("honeypot заполнен — ответ «успех», лид не создан", async ({ page }) => {
      const m = marker();
      const form = await f.open(page);
      await fill(form, f, m);
      await form.locator('[name="website"]').evaluate((el: HTMLInputElement) => (el.value = "http://spam.example"));
      await form.getByRole("button", { name: f.submit, exact: true }).click();
      await expect(page.getByText(f.success).first()).toBeVisible();
      await page.waitForTimeout(500);
      expect(await leadsOf(m)).toHaveLength(0);
    });
  });
}
