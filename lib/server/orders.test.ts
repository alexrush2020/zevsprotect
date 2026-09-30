import { describe, expect, it, vi } from "vitest";
import { priceCart } from "@/lib/cart-pricing";
import { computeTotal } from "@/payload/hooks/orders";
import type { Product } from "@/lib/types";
import type { Order as OrderDoc } from "@/payload/payload-types";
import {
  TRACK_NOT_FOUND,
  buildOrder,
  createOrderReceiver,
  createOrderTracker,
  customerOrders,
  hasOrderAccess,
  rememberOrder,
  toViewOrder,
  type OrderData,
  type OrderDeps,
} from "./orders";

const now = new Date("2026-09-30T10:00:00Z");
const base = { unit: "пара", minQty: 50, coating: "Без покрытия", coatingType: "", stock: 100, sizes: ["L", "XL"] };
const fabric = { ...base, id: "11", slug: "tkan", sku: "ZP-T", name: "Ткань", price: 100 } as unknown as Product;
const dipped = { ...base, id: "12", slug: "obliv", sku: "ZP-O", name: "Облив", price: 28.9, minQty: 12, coating: "Нитрил" } as unknown as Product;
const catalog = [fabric, dipped];

const input = (over: Record<string, unknown> = {}) => ({
  token: "tok-12345678",
  items: [{ productId: "tkan", size: "L", qty: 50 }],
  contact: { name: "Иван", phone: "+7 900 123-45-67", email: "ivan@firm.ru", company: "ООО Ромашка", inn: "7707083893", kpp: "" },
  delivery: { carrier: "cdek", city: "Ростов-на-Дону", address: "ул. Садовая, 1" },
  payment: "invoice_auto",
  comment: "",
  consent: true,
  ...over,
});

const built = (over: Record<string, unknown> = {}, ctx: { customerId?: number } = {}) => {
  const r = buildOrder(input(over), catalog, { now, ...ctx });
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe("buildOrder: деньги считает сервер", () => {
  it("подменённые цена, итог, название и доставка из клиента не влияют на заказ", () => {
    const forged = built({
      items: [{ productId: "tkan", size: "L", qty: 500, price: 1, total: 1, unitPrice: 0.01, title: "Даром" }],
      total: 1,
      goods: 1,
      deliveryCost: -1000,
      delivery: { carrier: "cdek", city: "Ростов", address: "Садовая, 1", cost: -1000, carrierName: "Бесплатная ТК" },
    });
    const honest = built({ items: [{ productId: "tkan", size: "L", qty: 500 }] });
    expect(forged.data.items).toEqual(honest.data.items);
    expect(forged.data.items[0]).toMatchObject({ title: "Ткань", sku: "ZP-T", price: 100, qty: 500, product: 11 });
    expect(forged.data.delivery).toMatchObject({ carrier: "cdek", carrierName: "СДЭК" });
    expect(forged.data.delivery).not.toHaveProperty("cost"); // CONTRA-5: доставку считает менеджер
    expect(forged.goods).toBe(50000);
    // итог, который поставит хук коллекции, совпадает с priceCart (та же формула и копейки)
    expect(computeTotal(forged.data.items, forged.data.delivery?.cost)).toBe(50000);
  });

  it("скидка по объёму на границах 999/1000 от суммарного qty товара, итог = priceCart", () => {
    expect(built({ items: [{ productId: "tkan", size: "L", qty: 950 }] }).data.items[0].price).toBe(100);
    const at = built({
      items: [
        { productId: "tkan", size: "L", qty: 500 },
        { productId: "tkan", size: "XL", qty: 500 },
      ],
    });
    expect(at.data.items.map((l) => l.price)).toEqual([95, 95]);
    expect(at.goods).toBe(95000);
  });

  it("НДС/копейки: 28.9 × 0.95 = 27.46, строки сходятся с итогом priceCart", () => {
    const items = [{ productId: "obliv", size: "L", qty: 1000 }];
    const r = built({ items });
    expect(r.data.items[0]).toMatchObject({ qty: 1008, price: 27.46 });
    const priced = priceCart(items, catalog);
    expect(r.goods).toBe(priced.goods);
    expect(computeTotal(r.data.items, undefined)).toBe(27679.68);
  });

  it("qty приводится к минимуму и упаковке, одинаковые строки сливаются", () => {
    const r = built({
      items: [
        { productId: "tkan", size: "L", qty: 1 },
        { productId: "obliv", size: "XL", qty: 13 },
        { productId: "obliv", size: "XL", qty: 1 },
      ],
    });
    expect(r.data.items.map((l) => [l.title, l.size, l.qty])).toEqual([
      ["Ткань", "L", 50],
      ["Облив", "XL", 24],
    ]);
  });

  it("недоступная позиция — ошибка до создания заказа", () => {
    const r = buildOrder(input({ items: [{ productId: "tkan", size: "L", qty: 50 }, { productId: "snyat", size: "L", qty: 50 }] }), catalog, { now });
    expect(r).toEqual({ ok: false, error: "Позиция «snyat» недоступна — уберите её из корзины" });
    expect(buildOrder(input({ items: [{ productId: "tkan", size: "S", qty: 50 }] }), catalog, { now })).toMatchObject({ ok: false, error: expect.stringContaining("размер S") });
    expect(buildOrder(input({ items: [{ productId: "tkan", size: "L", qty: 50, coating: "Золото" }] }), catalog, { now }).ok).toBe(false);
  });

  it("модель без цены не оформляется за 0 ₽ — только заявкой", () => {
    const free = { ...fabric, id: "13", slug: "bez-ceny", name: "Без цены", price: 0 } as Product;
    const r = buildOrder(input({ items: [{ productId: "tkan", size: "L", qty: 50 }, { productId: "bez-ceny", size: "L", qty: 50 }] }), [...catalog, free], { now });
    expect(r).toEqual({ ok: false, error: "Цену модели «Без цены» уточнит менеджер — оформите заявку" });
  });

  it("КПП: если заполнен — 9 символов", () => {
    expect(buildOrder(input({ contact: { ...input().contact, kpp: "12345" } }), catalog, { now })).toMatchObject({ ok: false, error: expect.stringContaining("КПП") });
    expect(buildOrder(input({ contact: { ...input().contact, kpp: "7707AB001" } }), catalog, { now }).ok).toBe(true);
    expect(buildOrder(input({ contact: { ...input().contact, kpp: "" } }), catalog, { now }).ok).toBe(true);
  });

  it("пустая корзина и мусорные позиции — отказ", () => {
    expect(buildOrder(input({ items: [] }), catalog, { now })).toEqual({ ok: false, error: "Корзина пуста" });
    expect(buildOrder(input({ items: undefined }), catalog, { now }).ok).toBe(false);
    for (const row of [{ productId: "tkan", size: "L", qty: "50" }, { productId: "tkan", size: "L", qty: -5 }, { productId: "tkan", qty: 50 }, { productId: "tkan", size: "L", qty: Infinity }, null])
      expect(buildOrder(input({ items: [row] }), catalog, { now }).ok).toBe(false);
  });

  it("без согласия ПДн — отказ; согласие ставит сервер", () => {
    expect(buildOrder(input({ consent: false }), catalog, { now })).toMatchObject({ ok: false, error: expect.stringContaining("согласие") });
    expect(buildOrder(input({ consent: "on" }), catalog, { now }).ok).toBe(false);
    expect(built().data.consentPdAt).toBe(now.toISOString());
  });

  it("контакты, оплата, доставка — серверная валидация", () => {
    const bad = [
      { contact: { ...input().contact, name: " " } },
      { contact: { ...input().contact, phone: "123" } },
      { contact: { ...input().contact, email: "" } },
      { contact: { ...input().contact, email: "не почта" } },
      { contact: { ...input().contact, inn: "12345" } },
      { payment: "cash" },
      { delivery: { carrier: "rocket", address: "x" } },
      { delivery: { carrier: "cdek", city: "Ростов", address: "" } },
      { comment: "x".repeat(2001) },
    ];
    for (const over of bad) expect(buildOrder(input(over), catalog, { now }).ok, JSON.stringify(over)).toBe(false);
  });

  it("самовывоз — адрес склада; ТК — «терминал» с названием из справочника; КПП — в комментарий", () => {
    expect(built({ delivery: { carrier: "pickup", address: "" } }).data.delivery).toMatchObject({ carrier: "pickup", city: "Таганрог", address: "Таганрог, Поляковское шоссе, 17" });
    expect(built({ delivery: { carrier: "dl", city: "Казань", address: "Ленина, 1" } }).data.delivery).toMatchObject({ carrier: "terminal", carrierName: "Деловые линии" });
    expect(built({ delivery: { carrier: "terminal", city: "Казань", address: "Ленина, 1" } }).data.delivery).toMatchObject({ carrier: "terminal", carrierName: "Терминал ТК" });
    expect(built({ comment: "Срочно", contact: { ...input().contact, kpp: "770701001" } }).data.comment).toBe("Срочно\nКПП: 770701001");
  });

  it("гость — без customer, контакты в guest; клиент — customer из сессии", () => {
    const guest = built();
    expect(guest.data).not.toHaveProperty("customer");
    expect(guest.data.guest).toMatchObject({ name: "Иван", phone: "+7 900 123-45-67", email: "ivan@firm.ru" });
    const client = built({ customer: 999 }, { customerId: 7 }); // customer из ввода игнорируется
    expect(client.data.customer).toBe(7);
    expect(client.data.paymentMethod).toBe("invoice_auto");
    expect(client.data.status).toBe("accepted");
  });
});

function deps(over: Partial<OrderDeps> = {}) {
  let seq = 0;
  return {
    catalog: async () => catalog,
    create: vi.fn(async (data: OrderData) => ({ number: `ZP-2026-${String(++seq).padStart(4, "0")}`, total: computeTotal(data.items, undefined) })),
    sendEmail: vi.fn(async () => undefined),
    managerEmail: async () => "sales@zevsprotect.ru",
    log: vi.fn(),
    ...over,
  } satisfies OrderDeps;
}

describe("createOrderReceiver", () => {
  it("создаёт заказ, письма клиенту и менеджеру с серверными суммами", async () => {
    const d = deps();
    const r = await createOrderReceiver()(d, { input: input({ items: [{ productId: "tkan", size: "L", qty: 50, price: 1 }] }), ip: "1.1.1.1", now });
    expect(r).toEqual({ ok: true, number: "ZP-2026-0001" });
    expect(d.create).toHaveBeenCalledOnce();
    const calls = vi.mocked(d.sendEmail).mock.calls;
    await vi.waitFor(() => expect(calls.map(([m]) => m.to)).toEqual(["ivan@firm.ru", "sales@zevsprotect.ru"]));
    const [client] = calls[0];
    expect(client.text).toContain("Итого: 5");
    expect(client.text).toContain("Ткань · L — 50 × 100 ₽");
  });

  it("повтор той же формы (двойной клик, повторный запрос) не создаёт дубль", async () => {
    const d = deps();
    const receive = createOrderReceiver();
    const [a, b] = await Promise.all([receive(d, { input: input(), ip: "1.1.1.1", now }), receive(d, { input: input(), ip: "1.1.1.1", now })]);
    const c = await receive(d, { input: input(), ip: "2.2.2.2", now: new Date(now.getTime() + 5000) });
    expect(a).toEqual(b);
    expect(c).toEqual(a);
    expect(d.create).toHaveBeenCalledOnce();
    // новая форма (новый токен) — новый заказ
    expect(await receive(d, { input: input({ token: "tok-other-123" }), ip: "1.1.1.1", now })).toEqual({ ok: true, number: "ZP-2026-0002" });
  });

  it("тот же токен с изменённой корзиной или оплатой — новый заказ, точный повтор — прежний", async () => {
    const d = deps();
    const receive = createOrderReceiver();
    const first = await receive(d, { input: input(), ip: "1.1.1.1", now });
    const changed = await receive(d, { input: input({ items: [{ productId: "tkan", size: "L", qty: 100 }] }), ip: "1.1.1.1", now });
    const payment = await receive(d, { input: input({ payment: "invoice_manager" }), ip: "1.1.1.1", now });
    const again = await receive(d, { input: input(), ip: "1.1.1.1", now });
    expect([first, changed, payment].map((r) => (r.ok ? r.number : ""))).toEqual(["ZP-2026-0001", "ZP-2026-0002", "ZP-2026-0003"]);
    expect(again).toEqual(first);
    expect(d.create).toHaveBeenCalledTimes(3);
  });

  it("ошибка валидации не кэшируется: после исправления тот же токен оформляет заказ", async () => {
    const d = deps();
    const receive = createOrderReceiver();
    expect((await receive(d, { input: input({ consent: false }), ip: "1.1.1.1", now })).ok).toBe(false);
    expect((await receive(d, { input: input(), ip: "1.1.1.1", now })).ok).toBe(true);
  });

  it("без токена формы — отказ", async () => {
    const d = deps();
    expect((await createOrderReceiver()(d, { input: input({ token: "" }), ip: "1.1.1.1", now })).ok).toBe(false);
    expect(d.create).not.toHaveBeenCalled();
  });

  it("сбой почты не теряет заказ", async () => {
    const d = deps({ sendEmail: vi.fn(async () => { throw new Error("SMTP down"); }), managerEmail: async () => { throw new Error("settings down"); } });
    const r = await createOrderReceiver()(d, { input: input(), ip: "1.1.1.1", now });
    expect(r).toEqual({ ok: true, number: "ZP-2026-0001" });
    await vi.waitFor(() => expect(d.log).toHaveBeenCalledWith("orders: письмо клиенту не отправлено", expect.any(Error)));
  });

  it("ответ не ждёт SMTP: письма уходят фоном (defer)", async () => {
    const tasks: (() => Promise<void>)[] = [];
    const sendEmail = vi.fn(() => new Promise<never>(() => {})); // SMTP завис
    const d = deps({ sendEmail, defer: (t) => void tasks.push(t) });
    expect(await createOrderReceiver()(d, { input: input(), ip: "1.1.1.1", now })).toEqual({ ok: true, number: "ZP-2026-0001" });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(tasks).toHaveLength(1);
    void tasks[0]();
    await vi.waitFor(() => expect(sendEmail).toHaveBeenCalledOnce());
    // и без defer ответ не ждёт зависшее письмо
    expect(await createOrderReceiver()(deps({ sendEmail }), { input: input(), ip: "1.1.1.1", now })).toMatchObject({ ok: true });
  });

  it("сбой записи — понятная ошибка, повтор того же токена пробует снова", async () => {
    const create = vi.fn().mockRejectedValueOnce(new Error("db down")).mockResolvedValueOnce({ number: "ZP-2026-0005", total: 5000 });
    const d = deps({ create });
    const receive = createOrderReceiver();
    expect((await receive(d, { input: input(), ip: "1.1.1.1", now })).ok).toBe(false);
    expect(await receive(d, { input: input(), ip: "1.1.1.1", now })).toEqual({ ok: true, number: "ZP-2026-0005" });
  });

  it("гонка номера (unique) — повтор записи", async () => {
    const conflict = Object.assign(new Error("unique"), { data: { errors: [{ path: "number" }] } });
    const create = vi.fn().mockRejectedValueOnce(conflict).mockResolvedValueOnce({ number: "ZP-2026-0002", total: 5000 });
    expect(await createOrderReceiver()(deps({ create }), { input: input(), ip: "1.1.1.1", now })).toEqual({ ok: true, number: "ZP-2026-0002" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("rate limit по IP", async () => {
    const d = deps();
    const receive = createOrderReceiver({ limit: 2, windowMs: 60_000, dedupMs: 60_000 });
    for (const t of ["tok-aaaaaaa1", "tok-aaaaaaa2"]) expect((await receive(d, { input: input({ token: t }), ip: "1.1.1.1", now })).ok).toBe(true);
    expect(await receive(d, { input: input({ token: "tok-aaaaaaa3" }), ip: "1.1.1.1", now })).toMatchObject({ ok: false, error: expect.stringContaining("Слишком много") });
    expect((await receive(d, { input: input({ token: "tok-aaaaaaa4" }), ip: "2.2.2.2", now })).ok).toBe(true);
  });
});

describe("доступ гостя к заказу", () => {
  const secret = "s3cret";
  it("только подписанный сервером номер; чужой номер и подделка — нет", () => {
    const cookie = rememberOrder(undefined, "ZP-2026-0001", secret);
    expect(hasOrderAccess(cookie, "ZP-2026-0001", secret)).toBe(true);
    expect(hasOrderAccess(cookie, "ZP-2026-0002", secret)).toBe(false);
    expect(hasOrderAccess("ZP-2026-0002.forged", "ZP-2026-0002", secret)).toBe(false);
    expect(hasOrderAccess(cookie.replace("ZP-2026-0001", "ZP-2026-0002"), "ZP-2026-0002", secret)).toBe(false);
    expect(hasOrderAccess(cookie, "ZP-2026-0001", "other")).toBe(false);
    expect(hasOrderAccess(cookie, "ZP-2026-0001", "")).toBe(false);
    expect(hasOrderAccess(undefined, "ZP-2026-0001", secret)).toBe(false);
  });

  it("cookie копит последние 20 заказов", () => {
    let cookie: string | undefined;
    for (let n = 1; n <= 25; n++) cookie = rememberOrder(cookie, `ZP-2026-${String(n).padStart(4, "0")}`, secret);
    expect(hasOrderAccess(cookie, "ZP-2026-0025", secret)).toBe(true);
    expect(hasOrderAccess(cookie, "ZP-2026-0006", secret)).toBe(true);
    expect(hasOrderAccess(cookie, "ZP-2026-0005", secret)).toBe(false);
  });
});

describe("toViewOrder: страницы берут снапшот, а не текущий прайс", () => {
  it("строки и итог — из сохранённого заказа", () => {
    const doc = {
      id: 1,
      number: "ZP-2026-0007",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      guest: { name: "Иван", phone: "+79001234567", email: "ivan@firm.ru" },
      items: [{ id: "a", product: { id: 11, slug: "tkan", unit: "пара" }, sku: "ZP-T", title: "Ткань (старое имя)", size: "L", price: 77.77, qty: 50 }],
      total: 3888.5,
      delivery: { city: "Ростов", carrier: "cdek", carrierName: "СДЭК", address: "Садовая, 1" },
      paymentMethod: "invoice_auto",
      status: "accepted",
    } as unknown as OrderDoc;
    const v = toViewOrder(doc);
    expect(v.lines).toEqual([{ key: "a", title: "Ткань (старое имя)", sku: "ZP-T", size: "L", qty: 50, unit: "пара", unitPrice: 77.77, total: 3888.5 }]);
    expect(v).toMatchObject({ id: "ZP-2026-0007", total: 3888.5, guest: true, paymentStatus: "pending", items: [{ productId: "tkan", size: "L", qty: 50 }] });
    expect(v).not.toHaveProperty("deliveryCost"); // доставку ещё не рассчитал менеджер
  });
});

const trackDoc = {
  id: 7,
  number: "ZP-2026-0007",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  customer: { id: 5, email: "Buyer@Firm.ru", name: "Пётр", phone: "+79005554433" },
  guest: { name: "Иван Петров", phone: "+79001234567", email: "ivan@firm.ru", company: "ООО Ромашка", inn: "7707083893" },
  items: [{ id: "a", product: { id: 11, slug: "tkan", unit: "пара" }, sku: "ZP-T", title: "Ткань", size: "L", price: 100, qty: 50 }],
  total: 5000,
  delivery: { city: "Ростов", carrier: "cdek", carrierName: "СДЭК", address: "Садовая, 1" },
  comment: "позвонить Ивану",
  paymentMethod: "invoice_auto",
  paymentStatus: "invoiced",
  status: "shipped",
} as unknown as OrderDoc;

describe("отслеживание /track: номер + email", () => {
  const find = vi.fn(async (n: string) => (n === trackDoc.number ? trackDoc : null));
  const req = (number: string, email: string, ip = "1.1.1.1") => ({ number, email, ip, now });

  it("верная пара — только статус, дата, состав и сумма, без ПДн", async () => {
    const track = createOrderTracker();
    const r = await track(find, req(" zp-2026-0007 ", " IVAN@firm.RU "));
    expect(r).toEqual({
      ok: true,
      order: {
        number: "ZP-2026-0007",
        createdAt: now.toISOString(),
        status: "shipped",
        paymentStatus: "invoiced",
        total: 5000,
        lines: [{ key: "a", title: "Ткань", size: "L", qty: 50, unit: "пара" }],
      },
    });
    const json = JSON.stringify(r);
    for (const pd of ["Иван", "Пётр", "+7900", "firm.ru", "Садовая", "Ростов", "Ромашка", "7707083893", "СДЭК", "позвонить"])
      expect(json).not.toContain(pd);
    // email клиента (из сессии оформления) тоже подходит
    expect((await track(find, req("ZP-2026-0007", "buyer@firm.ru"))).ok).toBe(true);
  });

  it("чужой email и несуществующий номер — одинаковый ответ, ничего не раскрыто", async () => {
    const track = createOrderTracker();
    const wrongEmail = await track(find, req("ZP-2026-0007", "other@firm.ru"));
    const noOrder = await track(find, req("ZP-2026-0999", "ivan@firm.ru"));
    const junk = await track(find, req("ZP-10990", "ivan@firm.ru"));
    const empty = await track(find, req("ZP-2026-0007", ""));
    for (const r of [wrongEmail, noOrder, junk, empty]) expect(r).toEqual({ ok: false, error: TRACK_NOT_FOUND });
  });

  it("гостевой заказ без email не находится по пустому email; сбой БД — не «не найден»", async () => {
    const track = createOrderTracker();
    const noMail = { ...trackDoc, customer: null, guest: { phone: "+79001234567" } } as unknown as OrderDoc;
    expect(await track(async () => noMail, req("ZP-2026-0007", "x@y.ru"))).toEqual({ ok: false, error: TRACK_NOT_FOUND });
    const r = await track(async () => {
      throw new Error("db down");
    }, req("ZP-2026-0007", "ivan@firm.ru"));
    expect(r.ok).toBe(false);
    expect(r).not.toEqual({ ok: false, error: TRACK_NOT_FOUND });
  });

  it("лимит попыток по IP — и для верной пары", async () => {
    const track = createOrderTracker({ limit: 2, windowMs: 60_000 });
    await track(find, req("ZP-2026-0001", "a@b.ru"));
    await track(find, req("ZP-2026-0002", "a@b.ru"));
    const blocked = await track(find, req("ZP-2026-0007", "ivan@firm.ru"));
    expect(blocked.ok).toBe(false);
    expect(blocked).not.toEqual({ ok: false, error: TRACK_NOT_FOUND });
    expect((await track(find, req("ZP-2026-0007", "ivan@firm.ru", "2.2.2.2"))).ok).toBe(true);
    expect((await track(find, { ...req("ZP-2026-0007", "ivan@firm.ru"), now: new Date(now.getTime() + 61_000) })).ok).toBe(true);
  });
});

describe("customerOrders: история заказов ЛК", () => {
  it("клиент — только через access коллекции и фильтр по своему id", async () => {
    const find = vi.fn(async () => ({ docs: [trackDoc] }));
    const user = { id: 5, collection: "customers" } as never;
    const res = await customerOrders({ find } as never, user);
    expect(res.ok && res.orders.map((o) => o.id)).toEqual(["ZP-2026-0007"]);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "orders", where: { customer: { equals: 5 } }, overrideAccess: false, user, disableErrors: true }),
    );
  });

  it("нет сессии клиента (истекла, сотрудник) — явный no-session, не пустая история; БД не спрашиваем", async () => {
    const find = vi.fn();
    expect(await customerOrders({ find } as never, null)).toEqual({ ok: false, reason: "no-session" });
    expect(await customerOrders({ find } as never, { id: 1, collection: "users" } as never)).toEqual({ ok: false, reason: "no-session" });
    expect(find).not.toHaveBeenCalled();
  });
});
