import { NextResponse, type NextRequest } from "next/server";
import { createLocalReq, getFieldsToSign, getPayload, jwtSign, type Payload, type TypedUser } from "payload";
import { addSessionToUser, generatePayloadCookie } from "payload/shared";
import config from "@payload-config";
import { STATE_COOKIE, STATE_COOKIE_PATH, allowCallback, isLocked, yandexCallback, yandexConfig } from "@/lib/server/yandex";

// Возврат из Яндекс ID (SH-YA): проверка state → профиль → клиент → сессия Payload → /account.
export const dynamic = "force-dynamic";

/** Сессия как у штатного /api/customers/login: sid в sessions пользователя, JWT, cookie коллекции. */
async function sessionCookie(payload: Payload, id: number | string): Promise<string> {
  const collectionConfig = payload.collections.customers.config;
  const req = await createLocalReq({}, payload);
  const user = (await payload.db.findOne({ collection: "customers", where: { id: { equals: id } }, req })) as TypedUser | null;
  if (!user) throw new Error("клиент не найден");
  // повторная проверка на свежей записи (между поиском и сессией могли заблокировать)
  if (isLocked((user as { lockUntil?: string | null }).lockUntil, Date.now())) throw new Error("аккаунт заблокирован");
  const { sid } = await addSessionToUser({ collectionConfig, payload, req, user });
  const fieldsToSign = getFieldsToSign({ collectionConfig, email: String(user.email), sid, user });
  const { token } = await jwtSign({ fieldsToSign, secret: payload.secret, tokenExpiration: collectionConfig.auth.tokenExpiration });
  const cookie = generatePayloadCookie({ collectionAuthConfig: collectionConfig.auth, cookiePrefix: payload.config.cookiePrefix, token });
  return process.env.NODE_ENV === "production" && !/;\s*Secure/i.test(cookie) ? `${cookie}; Secure` : cookie;
}

export async function GET(request: NextRequest) {
  const cfg = yandexConfig();
  if (!cfg) return new Response("Not found", { status: 404 });

  const redirect = (path: string, sessionSetCookie?: string) => {
    const res = NextResponse.redirect(new URL(path, cfg.baseUrl));
    res.headers.set("Cache-Control", "no-store");
    res.cookies.set(STATE_COOKIE, "", { path: STATE_COOKIE_PATH, maxAge: 0 }); // state одноразовый
    if (sessionSetCookie) res.headers.append("Set-Cookie", sessionSetCookie); // после cookies.set — тот перезаписывает заголовок
    return res;
  };

  const h = request.headers;
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
  const now = Date.now();
  if (!allowCallback(ip, now)) return redirect("/login?error=yandex");

  const q = request.nextUrl.searchParams;
  try {
    const payload = await getPayload({ config });
    const one = async (where: Record<string, { equals: string }>) =>
      (await payload.find({ collection: "customers", where, limit: 1, depth: 0, overrideAccess: true, showHiddenFields: true })) // lockUntil — скрытое поле auth
        .docs[0] ?? null;
    const result = await yandexCallback(
      cfg,
      { code: q.get("code"), state: q.get("state"), error: q.get("error") },
      request.cookies.get(STATE_COOKIE)?.value,
      now,
      {
        fetch,
        findByYandexId: (yandexId) => one({ yandexId: { equals: yandexId } }),
        findByEmail: (email) => one({ email: { equals: email } }),
        create: (data) => payload.create({ collection: "customers", data, overrideAccess: true }),
        log: (msg) => payload.logger.warn(msg),
      },
    );
    if (!result.ok) return redirect(`/login?error=${result.error}`);
    return redirect("/account?login=yandex", await sessionCookie(payload, result.customerId));
  } catch (e) {
    console.error("yandex oauth: сбой сессии", e instanceof Error ? e.message : e);
    return redirect("/login?error=yandex");
  }
}
