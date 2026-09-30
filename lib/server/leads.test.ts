import { describe, expect, it, vi } from "vitest";
import { buildLead, createLeadReceiver, createRateLimiter, type LeadDeps } from "./leads";
import { leadManagerMail } from "@/lib/mail/templates";

const now = new Date("2026-09-30T10:00:00Z");
const ok = { name: "Иван", phone: "+7 900 123-45-67", email: "ivan@firm.ru", message: "Нужно 5000 пар", consent: "on" };

function deps(over: Partial<LeadDeps> = {}) {
  let id = 0;
  return {
    create: vi.fn(async () => ({ id: ++id })),
    sendEmail: vi.fn(async () => undefined),
    mail: leadManagerMail,
    managerEmail: async () => "sales@zevsprotect.ru",
    ...over,
  } satisfies LeadDeps;
}

describe("buildLead", () => {
  it("раскладывает колонки и доп. поля, ставит consentPdAt на сервере", () => {
    const r = buildLead("calculation", { ...ok, city: "Ростов", volume: "5 000 пар", company: "" }, now, "/calculation");
    expect(r).toEqual({
      ok: true,
      data: {
        type: "calculation",
        name: "Иван",
        phone: "+7 900 123-45-67",
        email: "ivan@firm.ru",
        company: undefined,
        message: "Нужно 5000 пар",
        data: { city: "Ростов", volume: "5 000 пар" },
        consentPdAt: now.toISOString(),
        sourceUrl: "/calculation",
      },
    });
  });

  it("без согласия ПДн — отказ", () => {
    expect(buildLead("feedback", { ...ok, consent: "" }, now)).toMatchObject({ ok: false, error: expect.stringContaining("согласие") });
    expect(buildLead("feedback", { ...ok, consent: undefined }, now).ok).toBe(false);
  });

  it("невалидный ввод — отказ", () => {
    expect(buildLead("contact", ok, now)).toMatchObject({ ok: false }); // неизвестный тип
    expect(buildLead("feedback", { ...ok, name: "  " }, now)).toMatchObject({ ok: false, error: "Укажите имя" });
    expect(buildLead("feedback", { ...ok, phone: "12345" }, now).ok).toBe(false);
    expect(buildLead("feedback", { ...ok, email: "" }, now).ok).toBe(false);
    expect(buildLead("feedback", { ...ok, email: "не почта" }, now).ok).toBe(false);
    expect(buildLead("feedback", { ...ok, message: "" }, now).ok).toBe(false);
    expect(buildLead("feedback", { ...ok, "bad-key": "x" }, now).ok).toBe(false);
    expect(buildLead("feedback", { ...ok, message: "x".repeat(10_001) }, now).ok).toBe(false);
    expect(buildLead("feedback", { ...ok, name: 42 }, now).ok).toBe(false);
  });

  it("корзина: email необязателен, сообщение не требуется", () => {
    expect(buildLead("cart", { name: "Иван", phone: "+79001234567", consent: "on", items: "Феникс × 100" }, now).ok).toBe(true);
  });
});

describe("createRateLimiter", () => {
  it("не больше limit за окно, потом снова пускает", () => {
    const allow = createRateLimiter(2, 1000);
    expect(allow("a", 0)).toBe(true);
    expect(allow("a", 100)).toBe(true);
    expect(allow("a", 200)).toBe(false);
    expect(allow("b", 200)).toBe(true);
    expect(allow("a", 1001)).toBe(true);
  });
});

describe("createLeadReceiver", () => {
  const req = (over = {}) => ({ kind: "feedback", fields: ok, ip: "1.1.1.1", now, ...over });

  it("успех: запись в leads и письмо менеджеру", async () => {
    const d = deps();
    const r = await createLeadReceiver()(d, req());
    expect(r).toEqual({ ok: true, id: "1" });
    expect(d.create).toHaveBeenCalledWith(expect.objectContaining({ type: "feedback", consentPdAt: now.toISOString() }));
    expect(d.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "sales@zevsprotect.ru", subject: expect.stringContaining("feedback") }));
  });

  it("honeypot: делаем вид, что приняли, ничего не пишем", async () => {
    const d = deps();
    expect(await createLeadReceiver()(d, req({ fields: { ...ok, website: "http://spam" } }))).toEqual({ ok: true, id: "" });
    expect(d.create).not.toHaveBeenCalled();
  });

  it("без согласия и с невалидным вводом ничего не пишет", async () => {
    const d = deps();
    const receive = createLeadReceiver();
    expect((await receive(d, req({ fields: { ...ok, consent: "" } }))).ok).toBe(false);
    expect((await receive(d, req({ fields: { ...ok, phone: "" } }))).ok).toBe(false);
    expect(d.create).not.toHaveBeenCalled();
  });

  it("повтор (в т.ч. параллельный двойной клик) не создаёт дубль", async () => {
    const d = deps();
    const receive = createLeadReceiver();
    const [a, b] = await Promise.all([receive(d, req()), receive(d, req())]);
    const c = await receive(d, req({ now: new Date(now.getTime() + 30_000) }));
    expect([a, b, c]).toEqual([{ ok: true, id: "1" }, { ok: true, id: "1" }, { ok: true, id: "1" }]);
    expect(d.create).toHaveBeenCalledTimes(1);
    // после окна дедупа — новая заявка
    expect(await receive(d, req({ now: new Date(now.getTime() + 61_000) }))).toEqual({ ok: true, id: "2" });
  });

  it("превышение лимита по IP+форме", async () => {
    const d = deps();
    const receive = createLeadReceiver({ limit: 2, windowMs: 600_000, dedupMs: 60_000 });
    for (const m of ["a", "b"]) expect((await receive(d, req({ fields: { ...ok, message: m } }))).ok).toBe(true);
    const r = await receive(d, req({ fields: { ...ok, message: "c" } }));
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("Слишком много") });
    expect((await receive(d, req({ fields: { ...ok, message: "c" }, ip: "2.2.2.2" }))).ok).toBe(true);
    expect((await receive(d, req({ kind: "samples", fields: { ...ok, message: "c" } }))).ok).toBe(true);
    expect(d.create).toHaveBeenCalledTimes(4);
  });

  it("сбой БД — понятная ошибка и повтор разрешён; сбой почты не валит заявку", async () => {
    const receive = createLeadReceiver();
    const broken = deps({ create: vi.fn(async () => { throw new Error("db down"); }) });
    expect(await receive(broken, req())).toMatchObject({ ok: false, error: expect.stringContaining("Не удалось") });
    const d = deps({ sendEmail: vi.fn(async () => { throw new Error("smtp"); }) });
    expect(await receive(d, req())).toEqual({ ok: true, id: "1" });
  });

  it("без адреса менеджера письмо не шлёт", async () => {
    const d = deps({ managerEmail: async () => undefined });
    await createLeadReceiver()(d, req());
    expect(d.sendEmail).not.toHaveBeenCalled();
  });
});
