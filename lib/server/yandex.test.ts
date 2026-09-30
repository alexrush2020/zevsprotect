import { describe, expect, it, vi } from "vitest";
import {
  STATE_TTL_MS,
  authorizeUrl,
  mapYandexProfile,
  signState,
  verifyState,
  yandexCallback,
  yandexConfig,
  type NewYandexCustomer,
  type YandexDeps,
} from "./yandex";

const env = {
  YANDEX_CLIENT_ID: "cid",
  YANDEX_CLIENT_SECRET: "csecret",
  NEXT_PUBLIC_SERVER_URL: "https://zevs.test/",
  PAYLOAD_SECRET: "payload-secret",
};
const cfg = yandexConfig(env)!;
const NOW = 1_700_000_000_000;
const INFO = { id: "12345", login: "artem", default_email: "Artem@Yandex.ru", real_name: "Артём Соколов" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function yandexFetch(info: unknown = INFO, opts: { tokenStatus?: number; infoStatus?: number } = {}) {
  return vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.startsWith("https://oauth.yandex.ru/token"))
      return opts.tokenStatus ? json({ error: "invalid_grant" }, opts.tokenStatus) : json({ access_token: "AT-secret" });
    if (u.startsWith("https://login.yandex.ru/info")) return json(info, opts.infoStatus ?? 200);
    throw new Error(`unexpected ${u}`);
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

type Row = { id: number; email: string; yandexId?: string; authProvider?: string };

function deps(rows: Row[] = [], f = yandexFetch()) {
  const created: NewYandexCustomer[] = [];
  const logs: string[] = [];
  const d: YandexDeps = {
    fetch: f,
    findByYandexId: async (id) => rows.find((r) => r.yandexId === id) ?? null,
    findByEmail: async (email) => rows.find((r) => r.email === email) ?? null,
    create: async (data) => {
      created.push(data);
      const row = { id: 100 + rows.length, ...data };
      rows.push(row);
      return row;
    },
    log: (m) => logs.push(m),
  };
  return { d, created, logs, f };
}

function run(d: YandexDeps, over: { state?: string; cookie?: string; code?: string | null; error?: string; now?: number } = {}) {
  const state = over.state ?? signState(cfg.secret, NOW);
  return yandexCallback(
    cfg,
    { code: over.code === undefined ? "code-1" : over.code, state, error: over.error ?? null },
    over.cookie ?? state,
    over.now ?? NOW + 1000,
    d,
  );
}

describe("yandexConfig", () => {
  it("выключено без ключей, без адреса сайта или секрета", () => {
    expect(yandexConfig({})).toBeNull();
    expect(yandexConfig({ ...env, YANDEX_CLIENT_SECRET: "" })).toBeNull();
    expect(yandexConfig({ ...env, YANDEX_CLIENT_ID: undefined })).toBeNull();
    expect(yandexConfig({ ...env, NEXT_PUBLIC_SERVER_URL: "" })).toBeNull();
    expect(yandexConfig({ ...env, PAYLOAD_SECRET: "" })).toBeNull();
  });

  it("redirect_uri фиксирован от NEXT_PUBLIC_SERVER_URL; scope email+info", () => {
    expect(cfg.redirectUri).toBe("https://zevs.test/api/auth/yandex/callback");
    const u = new URL(authorizeUrl(cfg, "st"));
    expect(u.origin + u.pathname).toBe("https://oauth.yandex.ru/authorize");
    expect(Object.fromEntries(u.searchParams)).toEqual({
      response_type: "code",
      client_id: "cid",
      redirect_uri: "https://zevs.test/api/auth/yandex/callback",
      scope: "login:email login:info",
      state: "st",
    });
  });
});

describe("state", () => {
  it("подписанный, живёт 10 минут, совпадает с cookie", () => {
    const st = signState(cfg.secret, NOW);
    expect(verifyState(cfg.secret, st, st, NOW + STATE_TTL_MS - 1)).toBe(true);
    expect(verifyState(cfg.secret, st, st, NOW + STATE_TTL_MS)).toBe(false); // просрочен
    expect(verifyState(cfg.secret, st, undefined, NOW)).toBe(false); // нет cookie
    expect(verifyState(cfg.secret, st, signState(cfg.secret, NOW), NOW)).toBe(false); // чужая cookie
    expect(verifyState("other-secret", st, st, NOW)).toBe(false); // чужой ключ
    const [nonce, , sig] = st.split(".");
    const forged = `${nonce}.${NOW + 10 * STATE_TTL_MS}.${sig}`; // продлили срок без ключа
    expect(verifyState(cfg.secret, forged, forged, NOW + STATE_TTL_MS)).toBe(false);
    expect(verifyState(cfg.secret, "a.b", "a.b", NOW)).toBe(false);
  });
});

describe("mapYandexProfile", () => {
  it("id, email в нижнем регистре, имя; без email или id — null", () => {
    expect(mapYandexProfile(INFO)).toEqual({ yandexId: "12345", email: "artem@yandex.ru", name: "Артём Соколов" });
    expect(mapYandexProfile({ id: 7, emails: ["a@ya.ru"], login: "a" })).toEqual({ yandexId: "7", email: "a@ya.ru", name: "a" });
    expect(mapYandexProfile({ id: "1", login: "a" })).toBeNull();
    expect(mapYandexProfile({ default_email: "a@ya.ru" })).toBeNull();
    expect(mapYandexProfile({ id: "1", default_email: "не email" })).toBeNull();
    expect(mapYandexProfile(null)).toBeNull();
  });
});

describe("yandexCallback", () => {
  it("новый клиент: физлицо, authProvider yandex, случайный пароль, без согласия на ПДн", async () => {
    const { d, created, f } = deps();
    const r = await run(d);
    expect(r).toEqual({ ok: true, customerId: 100, created: true });
    expect(created).toHaveLength(1);
    const { password, ...rest } = created[0];
    expect(rest).toEqual({ yandexId: "12345", email: "artem@yandex.ru", name: "Артём Соколов", kind: "person", authProvider: "yandex" });
    expect(password.length).toBeGreaterThanOrEqual(40);
    expect(created[0]).not.toHaveProperty("consentPdAt");
    // обмен кода: client_secret в теле POST, профиль — с OAuth-токеном
    const [tokenCall, infoCall] = f.mock.calls as [string, RequestInit][];
    expect(tokenCall[1].method).toBe("POST");
    expect(String(tokenCall[1].body)).toContain("client_secret=csecret");
    expect((infoCall[1].headers as Record<string, string>).Authorization).toBe("OAuth AT-secret");
  });

  it("повторный вход находит клиента по yandexId, без новой записи", async () => {
    const rows: Row[] = [{ id: 5, email: "artem@yandex.ru", yandexId: "12345", authProvider: "yandex" }];
    const { d, created } = deps(rows);
    expect(await run(d)).toEqual({ ok: true, customerId: 5, created: false });
    expect(created).toHaveLength(0);
  });

  it("email занят клиентом с паролем → отказ yandex-exists, без линковки и записи", async () => {
    const rows: Row[] = [{ id: 9, email: "artem@yandex.ru", authProvider: "password" }];
    const { d, created } = deps(rows);
    expect(await run(d)).toEqual({ ok: false, error: "yandex-exists" });
    expect(created).toHaveLength(0);
    expect(rows[0].yandexId).toBeUndefined();
  });

  it("неверный, просроченный или подменённый state → отказ без обращения к Яндексу", async () => {
    for (const over of [
      { state: "bad", cookie: "bad" },
      { now: NOW + STATE_TTL_MS + 1 },
      { cookie: signState(cfg.secret, NOW) },
      { state: signState("attacker", NOW) },
    ]) {
      const { d, f, created } = deps();
      expect(await run(d, over)).toEqual({ ok: false, error: "yandex" });
      expect(f).not.toHaveBeenCalled();
      expect(created).toHaveLength(0);
    }
  });

  it("отказ пользователя (error=access_denied) или нет code → yandex", async () => {
    for (const over of [{ error: "access_denied", code: null }, { code: null }]) {
      const { d, f } = deps();
      expect(await run(d, over)).toEqual({ ok: false, error: "yandex" });
      expect(f).not.toHaveBeenCalled();
    }
  });

  it("ошибка Яндекса (token 400, info 401, профиль без email) → yandex, логи без токенов", async () => {
    for (const f of [
      yandexFetch(INFO, { tokenStatus: 400 }),
      yandexFetch(INFO, { infoStatus: 401 }),
      yandexFetch({ id: "12345", login: "artem" }),
    ]) {
      const { d, created, logs } = deps([], f);
      expect(await run(d)).toEqual({ ok: false, error: "yandex" });
      expect(created).toHaveLength(0);
      expect(logs.join(" ")).not.toMatch(/AT-secret|csecret|code-1/);
    }
  });

  it("Яндекс недоступен (сеть/таймаут) → yandex", async () => {
    const down = vi.fn(async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    }) as unknown as typeof fetch;
    const { d, created } = deps([], down as never);
    expect(await run(d)).toEqual({ ok: false, error: "yandex" });
    expect(created).toHaveLength(0);
  });

  it("сбой записи клиента (например, гонка по unique yandexId) → yandex", async () => {
    const { d } = deps();
    d.create = async () => {
      throw new Error("duplicate key");
    };
    expect(await run(d)).toEqual({ ok: false, error: "yandex" });
  });
});
