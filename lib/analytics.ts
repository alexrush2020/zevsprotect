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
    trackLinks: true,
    accurateTrackBounce: true,
  });
}

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

/** Хит просмотра страницы (абсолютный URL; клиентская навигация App Router); повтор того же URL подряд не шлётся. */
export function hit(url: string) {
  if (counterId === null || url === lastHit) return;
  const referer = lastHit ?? (typeof document !== "undefined" ? document.referrer : undefined);
  lastHit = url;
  call("hit", url, referer ? { referer } : undefined);
}

/** Только для тестов. */
export function resetAnalytics() {
  counterId = null;
  lastHit = null;
}
