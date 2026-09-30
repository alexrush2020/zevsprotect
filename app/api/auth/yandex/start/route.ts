import { NextResponse } from "next/server";
import { STATE_COOKIE, STATE_COOKIE_PATH, STATE_TTL_MS, authorizeUrl, signState, yandexConfig } from "@/lib/server/yandex";

// Начало входа через Яндекс ID (SH-YA). Без ключей в env фича выключена — 404, кнопка остаётся заглушкой.
export const dynamic = "force-dynamic";

export function GET() {
  const cfg = yandexConfig();
  if (!cfg) return new Response("Not found", { status: 404 });
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
