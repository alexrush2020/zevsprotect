"use server";

import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";

const MAX = 200;

/**
 * Избранное клиента (Customers.favorites) ↔ slug'и товаров витрины. Без сессии клиента — null (гость хранит локально).
 * merge — при входе: объединить локальный список с сохранённым; replace — после каждого переключения сердца.
 * Доступ — обычный access коллекций (клиент правит только себя; товары — только опубликованные).
 */
export async function syncFavorites(slugs: string[], mode: "merge" | "replace"): Promise<string[] | null> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (user?.collection !== "customers") return null;

  const wanted = Array.isArray(slugs) ? [...new Set(slugs.filter((s) => typeof s === "string"))].slice(0, MAX) : [];
  const found = wanted.length
    ? (await payload.find({ collection: "products", where: { slug: { in: wanted } }, limit: MAX, pagination: false, depth: 0, select: { slug: true }, user, overrideAccess: false })).docs
    : [];
  let ids: number[] = found.map((p) => p.id);

  if (mode === "merge") {
    const me = await payload.findByID({ collection: "customers", id: user.id, depth: 0, user, overrideAccess: false });
    const saved = (me.favorites ?? []).map((f) => (typeof f === "object" ? f.id : f));
    ids = [...new Set([...saved, ...ids])].slice(0, MAX);
  }

  const updated = await payload.update({ collection: "customers", id: user.id, data: { favorites: ids }, depth: 1, user, overrideAccess: false });
  return (updated.favorites ?? []).flatMap((f) => (typeof f === "object" ? [f.slug] : []));
}
