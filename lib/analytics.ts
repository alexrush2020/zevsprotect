import type { LeadKind } from "@/lib/server/leads";

/**
 * Яндекс.Метрика (T-AN). Счётчик включается только ID из Settings → «Счётчики» (components/analytics.tsx);
 * без него track/hit — no-op и внешний скрипт не грузится. GA не подключаем — TODO(BIZ-3), 152-ФЗ (CONTRA-4).
 * В параметры событий — только тип формы, slug, суммы и количество; ПДн вырезает safeParams.
 */

const FORM_EVENTS = {
  feedback: "form_submit_feedback",
  calculation: "form_submit_calculation",
  samples: "form_submit_samples",
  consultation: "form_submit_consultation",
  "product-request": "form_submit_product_request",
  pricelist: "form_submit_pricelist",
  cart: "form_submit_cart",
} as const satisfies Record<LeadKind, string>;

export type AnalyticsEvent =
  | "product_view"
  | "add_to_cart"
  | "checkout_start"
  | "order_success"
  | "payment_success" // онлайн-оплаты пока нет — вызвать при её подключении
  | "register_success"
  | "login_success"
  | "review_submit"
  | "form_submit_other"
  | (typeof FORM_EVENTS)[LeadKind];

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

export function formEvent(kind: string): AnalyticsEvent {
  return (FORM_EVENTS as Record<string, AnalyticsEvent>)[kind] ?? "form_submit_other";
}

const PII_KEY = /mail|phone|tel|name|fio|address|addr|city|inn|kpp|bik|bank|account|company|comment|message|contact/i;

/** Только примитивы и без ключей, похожих на ПДн (защита от случайной передачи полей формы). */
export function safeParams(params?: AnalyticsParams): AnalyticsParams | undefined {
  if (!params) return undefined;
  const out: AnalyticsParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || PII_KEY.test(k)) continue;
    if (typeof v === "string" && v.includes("@")) continue; // email в значении
    out[k] = v;
  }
  return out;
}

type Ym = ((...args: unknown[]) => void) & { a?: unknown[]; l?: number };
declare global {
  interface Window {
    ym?: Ym;
  }
}

let counterId: number | null = null;
let lastHit: string | null = null;

/** ID счётчика из Settings: только цифры, иначе счётчик выключен. */
export function parseCounterId(raw: unknown): number | null {
  const s = typeof raw === "string" ? raw.trim() : typeof raw === "number" ? String(raw) : "";
  return /^\d{1,12}$/.test(s) ? Number(s) : null;
}

/**
 * Очередь ym и init до загрузки tag.js (как в официальном сниппете): события, отправленные раньше
 * загрузки скрипта, не теряются. defer:true — первый хит шлёт hit(), чтобы не было дубля.
 */
export function initCounter(id: number) {
  if (typeof window === "undefined" || counterId === id) return;
  counterId = id;
  if (!window.ym) {
    const ym: Ym = function (...args: unknown[]) {
      (ym.a ??= []).push(args);
    };
    ym.l = Date.now();
    window.ym = ym;
  }
  call("init", {
    defer: true,
    webvisor: false,
    clickmap: false,
    trackHash: false,
    // авто-запросы tag.js берут location.href как есть — выключены, URL в Метрику уходит только через hit()
    trackLinks: false,
    accurateTrackBounce: false,
  });
}

export const counterReady = () => counterId !== null;

function call(...args: unknown[]) {
  if (counterId === null) return;
  try {
    window.ym?.(counterId, ...args);
  } catch {
    // блокировщик/сломанный tag.js не должен ломать витрину
  }
}

export function track(event: AnalyticsEvent, params?: AnalyticsParams) {
  const p = safeParams(params);
  if (p && Object.keys(p).length) call("reachGoal", event, p);
  else call("reachGoal", event);
}

const ALLOWED_QUERY = ["category"];

/**
 * URL для Метрики без секретов и идентификаторов: только путь и разрешённые query-ключи (token сброса пароля,
 * q, number, email, error — вырезаются), без hash; id заказа/счёта/оплаты маскируется; чужой домен — только origin.
 */
export function cleanUrl(raw: string, origin: string): string | undefined {
  let u: URL;
  try {
    u = new URL(raw, origin);
  } catch {
    return undefined;
  }
  if (u.origin !== new URL(origin).origin) return `${u.origin}/`;
  const path = u.pathname.replace(/^\/(order|invoice|pay)\/[^/]+/, "/$1/:id");
  const q = new URLSearchParams();
  for (const k of ALLOWED_QUERY) for (const v of u.searchParams.getAll(k)) q.append(k, v);
  const s = q.toString();
  return `${u.origin}${path}${s ? `?${s}` : ""}`;
}

/** Пути, на которых счётчик не инициализируется при заходе (tag.js не видит ссылку сброса пароля с токеном). */
export const isAnalyticsBlockedPath = (pathname: string) => pathname === "/forgot" || pathname.startsWith("/forgot/");

/** Хит просмотра страницы (клиентская навигация App Router); URL и referer — через cleanUrl, повтор подряд не шлётся. */
export function hit(rawUrl: string) {
  if (counterId === null) return;
  const origin = window.location.origin;
  const url = cleanUrl(rawUrl, origin);
  if (!url || url === lastHit) return;
  const referer = lastHit ?? (document.referrer ? cleanUrl(document.referrer, origin) : undefined);
  lastHit = url;
  call("hit", url, referer ? { referer } : undefined);
}

/** Только для тестов. */
export function resetAnalytics() {
  counterId = null;
  lastHit = null;
}
