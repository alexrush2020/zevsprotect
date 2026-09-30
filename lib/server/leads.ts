import type { Lead } from "@/payload/payload-types";

/**
 * Приём заявок с форм витрины (без 'use server' — чистое ядро, тестируется с моком payload).
 * Server action — lib/server/lead-action.ts.
 */

export type LeadKind = Lead["type"];
export const LEAD_KINDS: LeadKind[] = [
  "feedback",
  "calculation",
  "samples",
  "consultation",
  "product-request",
  "pricelist",
  "cart",
];

export type LeadResult = { ok: true; id: string } | { ok: false; error: string };

type Fields = Record<string, unknown>;
type LeadData = Omit<Lead, "id" | "createdAt" | "updatedAt" | "status" | "b24LeadId" | "syncError">;

export const HONEYPOT = "website";
const COLUMNS = ["name", "phone", "email", "company", "message"] as const;
const SKIP = new Set<string>([...COLUMNS, "consent", HONEYPOT]);
const MAX_EXTRA_KEYS = 20;
const MAX_LEN = 10_000;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Валидация и раскладка полей формы по колонкам leads; остальное — в data. */
export function buildLead(
  kind: unknown,
  fields: Fields,
  now: Date,
  sourceUrl?: string,
): { ok: true; data: LeadData } | { ok: false; error: string } {
  if (!LEAD_KINDS.includes(kind as LeadKind)) return { ok: false, error: "Неизвестный тип формы" };
  if (!fields || typeof fields !== "object") return { ok: false, error: "Пустая заявка" };
  const f = fields;
  const consent = f.consent;
  if (consent !== true && consent !== "on" && consent !== "true")
    return { ok: false, error: "Нужно согласие на обработку персональных данных" };

  const name = str(f.name);
  const phone = str(f.phone);
  const email = str(f.email);
  const message = str(f.message);
  if (!name) return { ok: false, error: "Укажите имя" };
  const digits = phone.replace(/\D/g, "").length;
  if (digits < 10 || digits > 15) return { ok: false, error: "Укажите телефон полностью" };
  if (kind !== "cart" && !email) return { ok: false, error: "Укажите email" };
  if (email && !/^(?!.*\.\.)[\w.!#$%&'*+/=?^`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(email)) return { ok: false, error: "Проверьте email" };
  if (kind === "feedback" && !message) return { ok: false, error: "Напишите сообщение" };

  const extraKeys = Object.keys(f).filter((k) => !SKIP.has(k));
  if (extraKeys.length > MAX_EXTRA_KEYS || extraKeys.some((k) => !/^[a-zA-Z]{1,32}$/.test(k)))
    return { ok: false, error: "Некорректные поля формы" };
  const data: Record<string, string> = {};
  for (const k of extraKeys) {
    const v = str(f[k]);
    if (v) data[k] = v;
  }
  const all = [name, phone, email, str(f.company), message, ...Object.values(data)];
  if (all.some((v) => v.length > MAX_LEN)) return { ok: false, error: "Слишком длинный текст" };

  return {
    ok: true,
    data: {
      type: kind as LeadKind,
      name,
      phone,
      email: email || undefined,
      company: str(f.company) || undefined,
      message: message || undefined,
      data: Object.keys(data).length ? data : undefined,
      consentPdAt: now.toISOString(),
      sourceUrl: sourceUrl?.slice(0, 500) || undefined,
    },
  };
}

/** Скользящее окно: не больше `limit` попаданий по ключу за `windowMs`. */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string, now: number): boolean => {
    for (const [k, ts] of hits) if (ts[ts.length - 1] <= now - windowMs) hits.delete(k);
    const ts = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
    if (ts.length >= limit) return false;
    ts.push(now);
    hits.set(key, ts);
    return true;
  };
}

export type LeadDeps = {
  create: (data: LeadData) => Promise<{ id: string | number }>;
  sendEmail: (m: { to: string; subject: string; text: string; html: string }) => Promise<unknown>;
  mail: (data: LeadData) => { subject: string; text: string; html: string };
  managerEmail: () => Promise<string | undefined>;
  log?: (msg: string, err?: unknown) => void;
};

export type LeadRequest = { kind: unknown; fields: Fields; ip: string; sourceUrl?: string; now?: Date };

/**
 * Приёмник заявок с состоянием в памяти процесса.
 * ponytail: rate limit и дедуп — Map в одном процессе; при нескольких инстансах — Redis/таблица.
 */
export function createLeadReceiver(opts = { limit: 5, windowMs: 10 * 60_000, dedupMs: 60_000 }) {
  const allow = createRateLimiter(opts.limit, opts.windowMs);
  const recent = new Map<string, { at: number; result: Promise<LeadResult> }>();

  return async function receive(deps: LeadDeps, req: LeadRequest): Promise<LeadResult> {
    const now = req.now ?? new Date();
    const t = now.getTime();
    // Бот заполнил скрытое поле — делаем вид, что всё хорошо, ничего не пишем.
    if (str(req.fields?.[HONEYPOT])) return { ok: true, id: "" };

    const built = buildLead(req.kind, req.fields, now, req.sourceUrl);
    if (!built.ok) return built;

    // Повтор той же заявки (двойной клик, повторная отправка) — тот же результат, без второй записи.
    for (const [k, v] of recent) if (v.at <= t - opts.dedupMs) recent.delete(k);
    const key = JSON.stringify([req.ip, built.data.type, built.data.name, built.data.phone, built.data.email, built.data.company, built.data.message, built.data.data]);
    const prev = recent.get(key);
    if (prev) return prev.result;

    if (!allow(`${req.ip}|${built.data.type}`, t))
      return { ok: false, error: "Слишком много заявок. Попробуйте через несколько минут или позвоните нам." };

    const result = (async (): Promise<LeadResult> => {
      const doc = await deps.create(built.data);
      const to = await deps.managerEmail().catch(() => undefined);
      if (to) {
        try {
          await deps.sendEmail({ to, ...deps.mail(built.data) });
        } catch (e) {
          deps.log?.("leads: письмо менеджеру не отправлено", e); // заявка уже сохранена — не валим форму
        }
      }
      return { ok: true, id: String(doc.id) };
    })().catch((e): LeadResult => {
      recent.delete(key);
      deps.log?.("leads: заявка не сохранена", e);
      return { ok: false, error: "Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам." };
    });
    recent.set(key, { at: t, result });
    return result;
  };
}
