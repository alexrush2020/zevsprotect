import { NextResponse, type NextRequest } from "next/server";
import {
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  STATE_TTL_MS,
  authorizeUrl,
  isCanonicalHost,
  signState,
  yandexConfig,
} from "@/lib/server/yandex";

// Начало входа через Яндекс ID (SH-YA). Без ключей в env фича выключена — 404, кнопка остаётся заглушкой.
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const cfg = yandexConfig();
  if (!cfg) return new Response("Not found", { status: 404 });
  // cookie state должна встать на тот же хост, что и redirect_uri
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!isCanonicalHost(host, cfg.baseUrl)) return NextResponse.redirect(`${cfg.baseUrl}/api/auth/yandex/start`, 307);
  const state = signState(cfg.secret, Date.now());
  const res = NextResponse.redirect(authorizeUrl(cfg, state));
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: STATE_COOKIE_PATH,
    maxAge: STATE_TTL_MS / 1000,
  });
  return res;
}
