import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { normalizeCart, priceCart } from "@/lib/cart-pricing";
import { PICKUP_ADDRESS, formatAddressLine } from "@/lib/addresses";
import { carriers } from "@/lib/delivery";
import { PAYMENT_LABEL } from "@/lib/format";
import { orderMail, orderManagerMail, type OrderMailItem } from "@/lib/mail/templates";
import { productCoatingOptions } from "@/lib/product-options";
import { EMAIL_RE, createRateLimiter } from "@/lib/server/leads";
import { computeTotal } from "@/payload/hooks/orders";
import { validateInn } from "@/payload/validators";
import type { Order, PaymentMethod, Product } from "@/lib/types";
import type { Order as OrderDoc, Product as ProductDoc, Customer } from "@/payload/payload-types";

/**
 * Оформление заказа с витрины (SH-CHK) — чистое ядро без 'use server', тестируется с моком payload.
 * Server action — lib/server/order-action.ts, чтение заказа для страниц — lib/server/order-page.ts.
 * Клиент присылает только позиции {slug, размер, покрытие, qty} и контакты: цены, суммы и названия
 * считает сервер через priceCart по каталогу Payload. Стоимость доставки не принимаем (CONTRA-5/BIZ-9:
 * «рассчитает менеджер») — delivery.cost пуст, total = товары.
 */

export type OrderInput = {
  /** Одноразовый токен формы: повтор с тем же токеном не создаёт второй заказ. */
  token: string;
  items: { productId: string; size: string; coating?: string; qty: number }[];
  contact: { name: string; phone: string; email: string; company?: string; inn?: string; kpp?: string };
  delivery: { carrier: string; city?: string; address?: string };
  payment: PaymentMethod;
  comment?: string;
  consent: boolean;
};

export type OrderResult = { ok: true; number: string } | { ok: false; error: string };

export type OrderData = Pick<OrderDoc, "items" | "paymentMethod" | "status" | "guest" | "delivery" | "consentPdAt"> & {
  customer?: number;
  comment?: string;
};

type Built = { ok: true; data: OrderData; goods: number } | { ok: false; error: string };

const PAYMENTS: PaymentMethod[] = ["invoice_auto", "invoice_manager", "online"];
const MAX_ROWS = 100;
const MAX_QTY = 1_000_000;
const MAX_LEN = 500;
const MAX_COMMENT = 2000;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const fail = (error: string) => ({ ok: false as const, error });

/** Способ доставки формы → поле delivery.carrier коллекции и название ТК из справочника (не из клиента). */
function resolveCarrier(id: string): { carrier: "cdek" | "terminal" | "pickup"; name: string } | null {
  if (id === "terminal") return { carrier: "terminal", name: "Терминал ТК" };
  const c = carriers.find((x) => x.id === id);
  if (!c) return null;
  return { carrier: c.id === "pickup" || c.id === "cdek" ? c.id : "terminal", name: c.name };
}

/** Проверка ввода и сборка документа заказа. Цены — только из каталога. */
export function buildOrder(input: unknown, catalog: Product[], ctx: { customerId?: number; now: Date }): Built {
  if (!input || typeof input !== "object") return fail("Пустой заказ");
  const i = input as Record<string, unknown>;
  if (i.consent !== true) return fail("Нужно согласие на обработку персональных данных");

  const c = (i.contact && typeof i.contact === "object" ? i.contact : {}) as Record<string, unknown>;
  const [name, phone, email, company, inn, kpp] = ["name", "phone", "email", "company", "inn", "kpp"].map((k) => str(c[k]));
  if (!name) return fail("Укажите имя");
  const digits = phone.replace(/\D/g, "").length;
  if (digits < 10 || digits > 15) return fail("Укажите телефон полностью");
  if (!email) return fail("Укажите email");
  if (!EMAIL_RE.test(email)) return fail("Проверьте email");
  if (validateInn()(inn) !== true) return fail("ИНН — 10 или 12 цифр без пробелов");
  if (kpp && !/^\d{4}[\dA-Z]{2}\d{3}$/.test(kpp)) return fail("КПП — 9 символов без пробелов");

  const payment = i.payment as PaymentMethod;
  if (!PAYMENTS.includes(payment)) return fail("Выберите способ оплаты");

  const d = (i.delivery && typeof i.delivery === "object" ? i.delivery : {}) as Record<string, unknown>;
  const carrier = resolveCarrier(str(d.carrier));
  if (!carrier) return fail("Выберите способ доставки");
  const pickup = carrier.carrier === "pickup";
  const city = pickup ? PICKUP_ADDRESS.city : str(d.city);
  const address = pickup ? formatAddressLine(PICKUP_ADDRESS) : str(d.address);
  if (!address) return fail("Укажите адрес доставки");

  const comment = str(i.comment);
  if (comment.length > MAX_COMMENT || [name, phone, email, company, inn, kpp, city, address].some((v) => v.length > MAX_LEN))
    return fail("Слишком длинный текст");

  if (!Array.isArray(i.items) || !i.items.length) return fail("Корзина пуста");
  if (i.items.length > MAX_ROWS) return fail("Слишком много позиций в одном заказе");
  const rows: OrderInput["items"] = [];
  for (const raw of i.items as unknown[]) {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const qty = r.qty;
    if (
      typeof r.productId !== "string" || !r.productId ||
      typeof r.size !== "string" || !r.size ||
      (r.coating !== undefined && r.coating !== null && typeof r.coating !== "string") ||
      typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0 || qty > MAX_QTY
    )
      return fail("Некорректная позиция заказа — обновите корзину");
    rows.push({ productId: r.productId, size: r.size, qty, ...(r.coating ? { coating: r.coating as string } : {}) });
  }

  // normalizeCart сливает одинаковые строки и приводит qty к минимуму/упаковке; priceCart — цены и скидка по объёму
  const { lines, goods } = priceCart(normalizeCart(rows, catalog), catalog);
  const missing = lines.find((l) => !l.available);
  if (missing)
    return fail(
      missing.product
        ? `Цену модели «${missing.product.name}» уточнит менеджер — оформите заявку`
        : `Позиция «${missing.productId}» недоступна — уберите её из корзины`,
    );
  if (!lines.length) return fail("Корзина пуста");
  for (const l of lines) {
    const p = l.product!;
    if (p.sizes.length && !p.sizes.includes(l.size)) return fail(`${p.name}: размер ${l.size} недоступен`);
    const coatings = productCoatingOptions(p);
    if (l.coating && coatings.length && !coatings.includes(l.coating))
      return fail(`${p.name}: покрытие «${l.coating}» недоступно`);
  }

  return {
    ok: true,
    goods,
    data: {
      ...(ctx.customerId ? { customer: ctx.customerId } : {}),
      // контакты по заказу — и для гостя, и для клиента (снапшот покупателя для счёта)
      guest: { name, phone, email, company: company || undefined, inn: inn || undefined },
      items: lines.map((l) => ({
        product: Number(l.product!.id),
        sku: l.product!.sku,
        title: l.product!.name,
        size: l.size,
        coating: l.coating || undefined,
        price: l.unitPrice,
        qty: l.qty,
      })),
      delivery: { city: city || undefined, carrier: carrier.carrier, carrierName: carrier.name, address },
      // ponytail: у orders.guest нет поля КПП — пишем в комментарий; поле guest.kpp — вместе с миграцией
      ...(comment || kpp ? { comment: [comment, kpp && `КПП: ${kpp}`].filter(Boolean).join("\n") } : {}),
      paymentMethod: payment,
      status: "accepted",
      consentPdAt: ctx.now.toISOString(),
    },
  };
}

export type OrderDeps = {
  catalog: () => Promise<Product[]>;
  /** Запись в orders; номер ставит хук коллекции. */
  create: (data: OrderData) => Promise<{ number: string; total?: number | null }>;
  sendEmail: (m: { to: string; subject: string; text: string; html: string }) => Promise<unknown>;
  managerEmail: () => Promise<string | undefined>;
  log?: (msg: string, err?: unknown) => void;
  /** Фоновая задача после ответа (в action — after() из next/server). По умолчанию — без ожидания. */
  defer?: (task: () => Promise<void>) => void;
};

export type OrderRequest = { input: unknown; ip: string; customerId?: number; now?: Date };

/** Отпечаток состава и оплаты: тот же токен с изменённой корзиной — новый заказ, точный повтор — прежний. */
function orderFingerprint(input: unknown): string {
  const i = (input && typeof input === "object" ? input : {}) as { items?: unknown; payment?: unknown };
  const rows = (Array.isArray(i.items) ? i.items : [])
    .map((r) => {
      const x = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
      return JSON.stringify([x.productId, x.size, x.coating ?? "", x.qty]);
    })
    .sort();
  return createHash("sha256").update(JSON.stringify([rows, i.payment])).digest("base64url").slice(0, 16);
}

const isNumberConflict = (e: unknown) =>
  !!(e as { data?: { errors?: { path?: string }[] } })?.data?.errors?.some((x) => x.path === "number");

/**
 * Приёмник заказов: дедуп по токену формы, rate limit по IP, запись, письма.
 * ponytail: дедуп и лимит — Map в памяти одного процесса; при нескольких инстансах — Redis/уникальный токен в БД.
 */
export function createOrderReceiver(opts = { limit: 10, windowMs: 10 * 60_000, dedupMs: 10 * 60_000 }) {
  const allow = createRateLimiter(opts.limit, opts.windowMs);
  const recent = new Map<string, { at: number; result: Promise<OrderResult> }>();

  return async function receive(deps: OrderDeps, req: OrderRequest): Promise<OrderResult> {
    const now = req.now ?? new Date();
    const t = now.getTime();
    const token = str((req.input as { token?: unknown } | null)?.token);
    if (!/^[\w-]{8,64}$/.test(token)) return fail("Форма устарела — обновите страницу");

    // Повтор той же формы (двойной клик, повторный запрос) — тот же результат, без второго заказа.
    for (const [k, v] of recent) if (v.at <= t - opts.dedupMs) recent.delete(k);
    const key = `${req.customerId ?? ""}|${token}|${orderFingerprint(req.input)}`;
    const prev = recent.get(key);
    if (prev) return prev.result;

    // ключ занимаем до первого await: параллельный дубль получает тот же промис
    const result = handle(deps, req, now).catch((e): OrderResult => {
      deps.log?.("orders: заказ не сохранён", e);
      return fail("Не удалось оформить заказ. Попробуйте ещё раз или позвоните нам.");
    });
    recent.set(key, { at: t, result });
    // отказ не кэшируем: исправленную форму (тот же токен) можно отправить снова
    void result.then((r) => {
      if (!r.ok && recent.get(key)?.result === result) recent.delete(key);
    });
    return result;
  };

  async function handle(deps: OrderDeps, req: OrderRequest, now: Date): Promise<OrderResult> {
    let catalog: Product[];
    try {
      catalog = await deps.catalog();
    } catch (e) {
      deps.log?.("orders: каталог недоступен", e);
      return fail("Не удалось оформить заказ. Попробуйте ещё раз или позвоните нам.");
    }
    const built = buildOrder(req.input, catalog, { customerId: req.customerId, now });
    if (!built.ok) return built;
    if (!allow(req.ip, now.getTime()))
      return fail("Слишком много заказов подряд. Попробуйте через несколько минут или позвоните нам.");

    let doc: { number: string; total?: number | null } | undefined;
    // номер ZP-YYYY-NNNN при гонке ловит unique — повторяем (см. хук Orders)
    for (let attempt = 1; !doc; attempt++) {
      try {
        doc = await deps.create(built.data);
      } catch (e) {
        if (attempt >= 3 || !isNumberConflict(e)) throw e;
      }
    }
    // письма не задерживают ответ: SMTP может висеть до таймаута
    const { number, total } = doc;
    const mails = () =>
      sendOrderMails(deps, number, total ?? built.goods, built.data).catch((e) => deps.log?.("orders: письма не отправлены", e));
    if (deps.defer) deps.defer(mails);
    else void mails();
    return { ok: true, number };
  }
}

/** Письма клиенту и менеджеру. Заказ уже сохранён — сбой почты только логируем. */
async function sendOrderMails(deps: OrderDeps, number: string, total: number, data: OrderData) {
  const items: OrderMailItem[] = data.items.map((l) => ({
    title: [l.title, l.size, l.coating].filter(Boolean).join(" · "),
    qty: l.qty,
    price: l.price,
  }));
  const guest = data.guest!;
  try {
    await deps.sendEmail({ to: guest.email!, ...orderMail({ number, items, total }) });
  } catch (e) {
    deps.log?.("orders: письмо клиенту не отправлено", e);
  }
  try {
    const to = await deps.managerEmail();
    if (to)
      await deps.sendEmail({
        to,
        ...orderManagerMail({
          number,
          items,
          total,
          contact: { name: guest.name!, phone: guest.phone!, email: guest.email!, company: guest.company, inn: guest.inn },
          customer: !!data.customer,
          delivery: [data.delivery?.carrierName, data.delivery?.address].filter(Boolean).join(", "),
          payment: PAYMENT_LABEL[data.paymentMethod],
          comment: data.comment,
        }),
      });
  } catch (e) {
    deps.log?.("orders: письмо менеджеру не отправлено", e);
  }
}

/* ---------- доступ гостя к своему заказу ---------- */

export const ORDER_ACCESS_COOKIE = "zp-orders";
const MAX_REMEMBERED = 20;

const sign = (number: string, secret: string) =>
  createHmac("sha256", secret).update(`order:${number}`).digest("base64url").slice(0, 32);

/**
 * Httponly-cookie со списком заказов, оформленных в этом браузере: «номер.подпись» через «~».
 * Номер заказа последовательный, поэтому гость читает заказ только по подписи сервера, не по номеру.
 */
export function rememberOrder(cookie: string | undefined, number: string, secret: string): string {
  const rest = (cookie ?? "").split("~").filter((e) => e && !e.startsWith(`${number}.`));
  return [...rest, `${number}.${sign(number, secret)}`].slice(-MAX_REMEMBERED).join("~");
}

export function hasOrderAccess(cookie: string | undefined, number: string, secret: string): boolean {
  if (!secret || !cookie) return false;
  const expected = Buffer.from(sign(number, secret));
  return cookie.split("~").some((e) => {
    if (!e.startsWith(`${number}.`)) return false;
    const got = Buffer.from(e.slice(number.length + 1));
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/* ---------- заказ Payload → вид для /order и /invoice ---------- */

export const ORDER_NUMBER_RE = /^ZP-\d{4}-\d{4,}$/;

export type OrderLineView = {
  key: string;
  title: string;
  sku: string;
  size: string;
  coating?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
};

/** Order витрины + строки из снапшота заказа (цены на момент оформления, не текущий прайс). */
export type ViewOrder = Order & { lines: OrderLineView[] };

const populated = <T extends object>(v: unknown): T | null => (v && typeof v === "object" ? (v as T) : null);

export function toViewOrder(doc: OrderDoc): ViewOrder {
  const customer = populated<Customer>(doc.customer);
  const g = doc.guest ?? {};
  const cost = doc.delivery?.cost;
  const lines = doc.items.map((l, idx): OrderLineView => {
    const p = populated<ProductDoc>(l.product);
    return {
      key: l.id ?? String(idx),
      title: l.title,
      sku: l.sku ?? "",
      size: l.size ?? "",
      ...(l.coating ? { coating: l.coating } : {}),
      qty: l.qty,
      unit: p?.unit ?? "пара",
      unitPrice: l.price,
      total: computeTotal([l], 0), // та же формула и округление, что у total заказа
    };
  });
  return {
    id: doc.number,
    createdAt: doc.createdAt,
    items: doc.items.map((l) => ({
      productId: populated<ProductDoc>(l.product)?.slug ?? "",
      size: l.size ?? "",
      qty: l.qty,
      ...(l.coating ? { coating: l.coating } : {}),
    })),
    profile: {
      name: g.name || customer?.name || "",
      phone: g.phone || customer?.phone || "",
      email: g.email || customer?.email || "",
      company: g.company || customer?.company || "",
      inn: g.inn || customer?.inn || "",
      kpp: customer?.kpp ?? "",
      address: doc.delivery?.address ?? "",
    },
    comment: doc.comment ?? "",
    payment: doc.paymentMethod,
    paymentStatus: doc.paymentStatus ?? "pending",
    status: doc.status,
    total: doc.total ?? computeTotal(doc.items, cost),
    guest: !doc.customer,
    city: doc.delivery?.city ?? undefined,
    carrier: doc.delivery?.carrier ?? undefined,
    carrierName: doc.delivery?.carrierName ?? undefined,
    ...(cost != null ? { deliveryCost: cost } : {}),
    lines,
  };
}
