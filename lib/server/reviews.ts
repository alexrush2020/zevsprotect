import { createHmac, timingSafeEqual } from "node:crypto";
import type { Review } from "@/payload/payload-types";
import { topicLabels, type ReviewTopic } from "@/lib/data/product-reviews";
import { HONEYPOT, createRateLimiter } from "@/lib/server/leads";

/**
 * Приём отзывов с карточки товара (без 'use server' — чистое ядро, тестируется с моком payload).
 * Server action — lib/server/review-action.ts. Отзыв всегда создаётся неодобренным (approved=false).
 */

export type ReviewInput = {
  rating: unknown;
  text: unknown;
  authorName?: unknown;
  company?: unknown;
  city?: unknown;
  colorLabel?: unknown;
  sizeLabel?: unknown;
  tags?: unknown;
  recommends?: unknown;
  [HONEYPOT]?: unknown;
};

export type ReviewData = Pick<Review, "authorName" | "rating" | "text" | "approved"> &
  Partial<Pick<Review, "company" | "city" | "colorLabel" | "sizeLabel" | "tags" | "recommends">>;

export type ReviewResult = { ok: true; id: string } | { ok: false; error: string };

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,119}$/;
const MAX_TEXT = 2000;
const MAX_SHORT = 120;
const TOPICS = Object.keys(topicLabels) as ReviewTopic[];

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Валидация полей формы. approved не принимается от клиента — всегда false. */
export function buildReview(input: ReviewInput): { ok: true; data: ReviewData } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Пустой отзыв" };
  const { rating } = input;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5)
    return { ok: false, error: "Поставьте оценку от 1 до 5" };
  const text = str(input.text);
  if (!text) return { ok: false, error: "Напишите несколько слов о партии или модели." };
  if (text.length > MAX_TEXT) return { ok: false, error: `Отзыв длиннее ${MAX_TEXT} символов` };
  const short = {
    authorName: str(input.authorName) || "Закупщик",
    company: str(input.company),
    city: str(input.city),
    colorLabel: str(input.colorLabel),
    sizeLabel: str(input.sizeLabel),
  };
  if (Object.values(short).some((v) => v.length > MAX_SHORT)) return { ok: false, error: "Слишком длинное значение поля" };
  const tags = Array.isArray(input.tags) ? input.tags : [];
  if (tags.some((t) => !TOPICS.includes(t as ReviewTopic))) return { ok: false, error: "Некорректная тема отзыва" };

  return {
    ok: true,
    data: {
      authorName: short.authorName,
      rating,
      text,
      ...(short.company ? { company: short.company } : {}),
      ...(short.city ? { city: short.city } : {}),
      ...(short.colorLabel ? { colorLabel: short.colorLabel } : {}),
      ...(short.sizeLabel ? { sizeLabel: short.sizeLabel } : {}),
      ...(tags.length ? { tags: [...new Set(tags as ReviewTopic[])] } : {}),
      ...(typeof input.recommends === "boolean" ? { recommends: input.recommends } : {}),
      approved: false,
    },
  };
}

export type ReviewDeps = {
  /** Опубликованный товар по slug (access витрины: черновики не находятся). */
  findProduct: (slug: string) => Promise<{ id: number } | null>;
  create: (data: ReviewData & { product: number; customer?: number }) => Promise<{ id: string | number }>;
  log?: (msg: string, err?: unknown) => void;
};

export type ReviewRequest = { productSlug: unknown; input: ReviewInput; ip: string; customerId?: number; now?: number };

/**
 * Приёмник отзывов с состоянием в памяти процесса.
 * ponytail: rate limit и дедуп — Map в одном процессе; при нескольких инстансах — Redis/таблица.
 */
export function createReviewReceiver(opts = { limit: 3, ipLimit: 10, windowMs: 10 * 60_000, dedupMs: 60_000 }) {
  const allow = createRateLimiter(opts.limit, opts.windowMs); // IP + товар
  const allowIp = createRateLimiter(opts.ipLimit, opts.windowMs); // IP на все товары
  const recent = new Map<string, { at: number; result: Promise<ReviewResult> }>();

  return async function receive(deps: ReviewDeps, req: ReviewRequest): Promise<ReviewResult> {
    const t = req.now ?? Date.now();
    // Бот заполнил скрытое поле — делаем вид, что всё хорошо, ничего не пишем.
    if (str(req.input?.[HONEYPOT])) return { ok: true, id: "" };
    const slug = str(req.productSlug);
    if (!SLUG_RE.test(slug)) return { ok: false, error: "Товар не найден" };
    const built = buildReview(req.input);
    if (!built.ok) return built;

    // Повтор той же отправки (двойной клик) — тот же результат, без второй записи.
    for (const [k, v] of recent) if (v.at <= t - opts.dedupMs) recent.delete(k);
    const key = JSON.stringify([req.ip, req.customerId, slug, built.data]);
    const prev = recent.get(key);
    if (prev) return prev.result;

    if (!allow(`${req.ip}|${slug}`, t) || !allowIp(req.ip, t))
      return { ok: false, error: "Слишком много отзывов. Попробуйте через несколько минут." };

    const result = (async (): Promise<ReviewResult> => {
      const product = await deps.findProduct(slug);
      if (!product) return { ok: false, error: "Товар не найден" };
      const doc = await deps.create({
        ...built.data,
        product: product.id,
        ...(req.customerId != null ? { customer: req.customerId } : {}),
        approved: false,
      });
      return { ok: true, id: String(doc.id) };
    })().catch((e): ReviewResult => {
      deps.log?.("reviews: отзыв не сохранён", e);
      return { ok: false, error: "Не удалось отправить отзыв. Попробуйте ещё раз." };
    });
    recent.set(key, { at: t, result });
    void result.then((r) => {
      if (!r.ok) recent.delete(key); // отказ не кэшируем — повтор после исправления/сбоя пройдёт
    });
    return result;
  };
}

/* ---------- «мои отзывы на модерации» для браузера автора ---------- */

export const REVIEW_ACCESS_COOKIE = "zp-reviews";
const MAX_REMEMBERED = 30;

const sign = (id: string, secret: string) =>
  createHmac("sha256", secret).update(`review:${id}`).digest("base64url").slice(0, 32);

/** Httponly-cookie «id.подпись~…» — отзывы, отправленные из этого браузера (гость видит свои до модерации). */
export function rememberReview(cookie: string | undefined, id: string, secret: string): string {
  const rest = (cookie ?? "").split("~").filter((e) => e && !e.startsWith(`${id}.`));
  return [...rest, `${id}.${sign(id, secret)}`].slice(-MAX_REMEMBERED).join("~");
}

/** id отзывов из cookie с верной подписью; подделанные записи отбрасываются. */
export function rememberedReviewIds(cookie: string | undefined, secret: string): number[] {
  if (!secret || !cookie) return [];
  return cookie.split("~").flatMap((e) => {
    const [id, sig = ""] = e.split(".");
    if (!/^\d{1,12}$/.test(id)) return [];
    const got = Buffer.from(sig);
    const expected = Buffer.from(sign(id, secret));
    return got.length === expected.length && timingSafeEqual(got, expected) ? [Number(id)] : [];
  });
}
