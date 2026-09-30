import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanUrl, formEvent, hit, initCounter, isAnalyticsBlockedPath, parseCounterId, resetAnalytics, safeParams, track } from "@/lib/analytics";

const w = globalThis as unknown as { window?: { ym?: unknown; location?: { origin: string } }; document?: { referrer: string } };

beforeEach(() => {
  resetAnalytics();
  w.window = { location: { origin: "http://x" } };
  w.document = { referrer: "" };
});
afterEach(() => {
  delete w.window;
  delete w.document;
});

describe("analytics", () => {
  it("без счётчика — no-op, ym не вызывается и не создаётся", () => {
    const ym = vi.fn();
    track("add_to_cart", { slug: "atlant" });
    hit("http://localhost/");
    expect(w.window!.ym).toBeUndefined();
    w.window!.ym = ym;
    track("add_to_cart");
    expect(ym).not.toHaveBeenCalled();
  });

  it("init с выключенными вебвизором/картой кликов, reachGoal без ПДн", () => {
    const ym = vi.fn();
    w.window!.ym = ym;
    initCounter(123);
    expect(ym).toHaveBeenCalledWith(123, "init", expect.objectContaining({ webvisor: false, clickmap: false, trackHash: false, defer: true }));
    track("order_success", { order_price: 1500, currency: "RUB", email: "a@b.ru", phone: "+7", name: "Иван", address: "ул." });
    expect(ym).toHaveBeenLastCalledWith(123, "reachGoal", "order_success", { order_price: 1500, currency: "RUB" });
    track("checkout_start");
    expect(ym).toHaveBeenLastCalledWith(123, "reachGoal", "checkout_start");
  });

  it("без tag.js события копятся в очереди ym, а не теряются", () => {
    initCounter(7);
    track("product_view", { slug: "atlant" });
    const queue = (w.window!.ym as unknown as { a: unknown[][] }).a;
    expect(queue.map((a) => a[1])).toEqual(["init", "reachGoal"]);
  });

  it("не падает, если ym бросает (блокировщик)", () => {
    w.window!.ym = () => {
      throw new Error("blocked");
    };
    expect(() => initCounter(1)).not.toThrow();
    expect(() => track("login_success")).not.toThrow();
  });

  it("hit не дублирует тот же URL и передаёт предыдущий как referer", () => {
    const ym = vi.fn();
    w.window!.ym = ym;
    initCounter(5);
    hit("http://x/a");
    hit("http://x/a");
    hit("http://x/b");
    const hits = ym.mock.calls.filter((c) => c[1] === "hit");
    expect(hits).toEqual([
      [5, "hit", "http://x/a", undefined],
      [5, "hit", "http://x/b", { referer: "http://x/a" }],
    ]);
  });

  it("hit: токен, поиск, номер, email и id заказа не уходят ни в url, ни в referer; category сохраняется", () => {
    w.document!.referrer = "https://mail.example/inbox?uid=42&email=a@b.ru";
    initCounter(9);
    hit("http://x/forgot/reset?token=abc123");
    hit("http://x/catalog?category=nitril&q=%D0%B8%D0%B2%D0%B0%D0%BD#top");
    hit("http://x/order/ZP-2026-0001");
    hit("http://x/track?number=ZP-2026-0002&email=a%40b.ru");
    hit("http://x/pay/ZP-2026-0003/success");
    const queue = (w.window!.ym as unknown as { a: unknown[][] }).a;
    const hits = queue.filter((a) => a[1] === "hit").map((a) => [a[2], (a[3] as { referer?: string } | undefined)?.referer]);
    expect(hits).toEqual([
      ["http://x/forgot/reset", "https://mail.example/"],
      ["http://x/catalog?category=nitril", "http://x/forgot/reset"],
      ["http://x/order/:id", "http://x/catalog?category=nitril"],
      ["http://x/track", "http://x/order/:id"],
      ["http://x/pay/:id/success", "http://x/track"],
    ]);
    const dump = JSON.stringify(queue);
    for (const leak of ["abc123", "token", "q=", "ZP-2026", "email", "a@b", "a%40b", "uid", "#top"]) expect(dump).not.toContain(leak);
  });

  it("cleanUrl и заблокированные пути", () => {
    expect(cleanUrl("/invoice/15?print=1", "http://x")).toBe("http://x/invoice/:id");
    expect(cleanUrl("/catalog?category=a&category=b&sort=1", "http://x")).toBe("http://x/catalog?category=a&category=b");
    expect(isAnalyticsBlockedPath("/forgot/reset")).toBe(true);
    expect(isAnalyticsBlockedPath("/forgot")).toBe(true);
    expect(isAnalyticsBlockedPath("/forgotten")).toBe(false);
  });

  it("safeParams вырезает ПДн по ключу и email в значении", () => {
    expect(
      safeParams({ slug: "atlant", qty: 50, customerEmail: "x", contactPhone: "1", company: "ООО", inn: "1", note: "a@b.ru", fio: "И" }),
    ).toEqual({ slug: "atlant", qty: 50 });
    expect(safeParams()).toBeUndefined();
  });

  it("formEvent: типы форм → события, неизвестный → form_submit_other", () => {
    expect(formEvent("feedback")).toBe("form_submit_feedback");
    expect(formEvent("product-request")).toBe("form_submit_product_request");
    expect(formEvent("cart")).toBe("form_submit_cart");
    expect(formEvent("hack")).toBe("form_submit_other");
  });

  it("parseCounterId: только цифры", () => {
    expect(parseCounterId(" 12345 ")).toBe(12345);
    expect(parseCounterId("")).toBeNull();
    expect(parseCounterId(null)).toBeNull();
    expect(parseCounterId("123);alert(1")).toBeNull();
    expect(parseCounterId("G-ABC")).toBeNull();
  });
});
