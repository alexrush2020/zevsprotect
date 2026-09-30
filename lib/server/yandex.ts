import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { EMAIL_RE, createRateLimiter } from "@/lib/server/leads";

/**
 * Вход через Яндекс ID (SH-YA): чистое ядро без Payload/Next — подпись state, обмен кода, профиль,
 * решение «войти / создать / отказать». Маршруты — app/api/auth/yandex/{start,callback}.
 * Фича включена только при YANDEX_CLIENT_ID + YANDEX_CLIENT_SECRET (+ NEXT_PUBLIC_SERVER_URL, PAYLOAD_SECRET).
 */

export const STATE_COOKIE = "yandex-oauth-state";
export const STATE_COOKIE_PATH = "/api/auth/yandex";
export const STATE_TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 8000;

export type YandexConfig = { clientId: string; clientSecret: string; redirectUri: string; baseUrl: string; secret: string };

export function yandexConfig(env: Record<string, string | undefined> = process.env): YandexConfig | null {
  const clientId = env.YANDEX_CLIENT_ID?.trim();
  const clientSecret = env.YANDEX_CLIENT_SECRET?.trim();
  const baseUrl = env.NEXT_PUBLIC_SERVER_URL?.trim().replace(/\/+$/, "");
  const secret = env.PAYLOAD_SECRET;
  if (!clientId || !clientSecret || !baseUrl || !secret) return null;
  return { clientId, clientSecret, baseUrl, secret, redirectUri: `${baseUrl}/api/auth/yandex/callback` };
}

const sign = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("base64url");

const safeEqual = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** state = nonce.exp.hmac; он же кладётся в httpOnly-cookie и сверяется в callback. */
export function signState(secret: string, now: number): string {
  const data = `${randomBytes(16).toString("base64url")}.${now + STATE_TTL_MS}`;
  return `${data}.${sign(secret, data)}`;
}

export function verifyState(secret: string, state: string | null | undefined, cookie: string | null | undefined, now: number): boolean {
  if (!state || !cookie || !safeEqual(state, cookie)) return false;
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const [nonce, exp, sig] = parts;
  if (!safeEqual(sig, sign(secret, `${nonce}.${exp}`))) return false;
  return Number(exp) > now;
}

export function authorizeUrl(cfg: YandexConfig, state: string): string {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: "login:email login:info",
    state,
  });
  return `https://oauth.yandex.ru/authorize?${q}`;
}

/** Код → токен → профиль. Ошибки — без токенов и тел ответов (только статус). */
export async function fetchYandexProfile(cfg: YandexConfig, code: string, f: typeof fetch): Promise<unknown> {
  const tokenRes = await f("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!tokenRes.ok) throw new Error(`token HTTP ${tokenRes.status}`);
  const token = ((await tokenRes.json()) as { access_token?: unknown }).access_token;
  if (typeof token !== "string" || !token) throw new Error("token: нет access_token");

  const infoRes = await f("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!infoRes.ok) throw new Error(`info HTTP ${infoRes.status}`);
  return infoRes.json();
}

export type YandexProfile = { yandexId: string; email: string; name: string };

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function mapYandexProfile(info: unknown): YandexProfile | null {
  if (!info || typeof info !== "object") return null;
  const i = info as Record<string, unknown>;
  const yandexId = typeof i.id === "number" ? String(i.id) : s(i.id);
  const emails = Array.isArray(i.emails) ? i.emails : [];
  const email = (s(i.default_email) || s(emails[0])).toLowerCase();
  if (!yandexId || !EMAIL_RE.test(email)) return null;
  const full = [s(i.first_name), s(i.last_name)].filter(Boolean).join(" ");
  const name = (s(i.real_name) || s(i.display_name) || full || s(i.login) || "Клиент").slice(0, 200);
  return { yandexId, email, name };
}

export type NewYandexCustomer = {
  email: string;
  name: string;
  password: string;
  kind: "person";
  authProvider: "yandex";
  yandexId: string;
};

export type YandexDeps = {
  fetch: typeof fetch;
  findByYandexId: (id: string) => Promise<{ id: number | string } | null>;
  findByEmail: (email: string) => Promise<{ id: number | string } | null>;
  create: (data: NewYandexCustomer) => Promise<{ id: number | string }>;
  log: (msg: string) => void;
};

export type YandexError = "yandex" | "yandex-exists";
export type YandexResult = { ok: true; customerId: number | string; created: boolean } | { ok: false; error: YandexError };

/**
 * Решение по callback: свой yandexId → вход; email уже занят другим клиентом → отказ без автолинковки
 * (риск захвата аккаунта); иначе — новый клиент-физлицо. Согласие на ПДн не ставится (SH-CONSENT).
 */
export async function yandexCallback(
  cfg: YandexConfig,
  q: { code?: string | null; state?: string | null; error?: string | null },
  cookieState: string | undefined,
  now: number,
  deps: YandexDeps,
): Promise<YandexResult> {
  const fail = (why: string, error: YandexError = "yandex"): YandexResult => {
    deps.log(`yandex oauth: ${why}`);
    return { ok: false, error };
  };
  if (!verifyState(cfg.secret, q.state, cookieState, now)) return fail("неверный или просроченный state");
  if (q.error || !q.code) return fail(`отказ авторизации (${s(q.error).slice(0, 40) || "нет code"})`);

  let profile: YandexProfile | null;
  try {
    profile = mapYandexProfile(await fetchYandexProfile(cfg, q.code, deps.fetch));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "ошибка запроса");
  }
  if (!profile) return fail("профиль без id или email");

  const own = await deps.findByYandexId(profile.yandexId);
  if (own) return { ok: true, customerId: own.id, created: false };
  if (await deps.findByEmail(profile.email)) return fail("email уже занят — автолинковка запрещена", "yandex-exists");

  try {
    const doc = await deps.create({
      ...profile,
      password: randomBytes(32).toString("base64url"), // пользователю не сообщается; сменить — через «Забыли пароль»
      kind: "person",
      authProvider: "yandex",
    });
    return { ok: true, customerId: doc.id, created: true };
  } catch (e) {
    return fail(`создание клиента: ${e instanceof Error ? e.message : "ошибка"}`);
  }
}

/** ponytail: лимит — Map одного процесса, как у leads/orders; при нескольких инстансах — Redis. */
export const allowCallback = createRateLimiter(20, 10 * 60 * 1000);
