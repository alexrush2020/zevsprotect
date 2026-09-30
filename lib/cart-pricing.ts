import { legacySlug } from "@/lib/legacy-product-ids";
import { cartLineKey } from "@/lib/lots";
import { snapOrderQty } from "@/lib/order-qty";
import { productCoatingOptions } from "@/lib/product-options";
import { splitVat } from "@/lib/vat";
import { volumeUnitPrice } from "@/lib/volume-quote";
import type { CartItem, Product } from "@/lib/types";

/**
 * Пересчёт корзины по каталогу (Payload). Чистая функция: клиент (lib/store.tsx) и сервер
 * (оформление заказа, SH-CHK) считают одинаково, цене и количеству из клиента не доверяем.
 * - productId позиции — slug товара; нет в каталоге или нет цены (price ≤ 0, «уточнит менеджер») →
 *   available:false: в сумму не входит, к заказу не уходит (только заявкой).
 * - qty строки приводится к видимому минимуму и шагу упаковки, округление вверх (snapOrderQty).
 * - скидка по объёму — от суммарного qty товара по всем размерам/покрытиям.
 * - goods — сумма по товарам round(цена × qty товара), как cartGoodsTotal прототипа; НДС внутри (splitVat).
 */
export type PricedCartLine = CartItem & {
  product: Product | null;
  available: boolean;
  unitPrice: number;
  total: number;
};

const roundMoney = (v: number) => Math.round(v * 100) / 100;

/** Модель можно заказать по цене сайта: цена задана и больше нуля (пустая цена из 1С мапится в 0). */
export const hasOrderPrice = (p: Pick<Product, "price">) => Number.isFinite(p.price) && p.price > 0;

export function priceCart(items: CartItem[], catalog: Product[]) {
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const rows = items.flatMap((item): (CartItem & { product: Product | null })[] => {
    const product = bySlug.get(item.productId) ?? null;
    if (!product) return [{ ...item, product }];
    const qty = snapOrderQty(Number(item.qty), product, { allowZero: true });
    return qty ? [{ ...item, qty, product }] : [];
  });
  const productQty = new Map<string, number>();
  for (const row of rows) {
    if (row.product && hasOrderPrice(row.product)) productQty.set(row.productId, (productQty.get(row.productId) ?? 0) + row.qty);
  }
  let goods = 0;
  for (const [slug, qty] of productQty) {
    goods += roundMoney(volumeUnitPrice(bySlug.get(slug)!, qty) * qty);
  }
  const lines: PricedCartLine[] = rows.map((row) => {
    if (!row.product || !hasOrderPrice(row.product)) return { ...row, available: false, unitPrice: 0, total: 0 };
    const unitPrice = volumeUnitPrice(row.product, productQty.get(row.productId)!);
    return { ...row, available: true, unitPrice, total: roundMoney(unitPrice * row.qty) };
  });
  goods = roundMoney(goods);
  const { net, vat } = splitVat(goods);
  return { lines, goods, net, vat };
}

/** Позиции к оформлению: только доступные, qty после snapOrderQty — ровно то, что вошло в goods. */
export function orderableItems(lines: PricedCartLine[]): CartItem[] {
  return lines
    .filter((l) => l.available)
    .map(({ productId, size, coating, qty }) => ({ productId, size, qty, ...(coating ? { coating } : {}) }));
}

/**
 * «Повторить заказ»: строки снапшота заказа → позиции корзины по текущему каталогу (цены — не из снапшота,
 * корзина пересчитает их priceCart, как и сервер при оформлении). Пропускаются: модели нет в каталоге,
 * нет цены (уточнит менеджер), размер или покрытие больше не выпускаются. skipped — число таких строк снапшота.
 */
export function repeatOrderItems(items: CartItem[], catalog: Product[]): { items: CartItem[]; skipped: number } {
  const available = priceCart(normalizeCart(items, catalog), catalog).lines.filter((l) => {
    if (!l.available) return false;
    const p = l.product!;
    const coatings = productCoatingOptions(p);
    return (!p.sizes?.length || p.sizes.includes(l.size)) && (!l.coating || !coatings.length || coatings.includes(l.coating));
  });
  const kept = new Set(available.map(cartLineKey));
  return { items: orderableItems(available), skipped: items.filter((i) => !kept.has(cartLineKey(i))).length };
}

/**
 * Корзина из localStorage: мусор отбрасывается, одинаковые строки сливаются, qty приводится к упаковке.
 * Товар вне каталога (снят с публикации или каталог не загрузился) сохраняется как есть — priceCart пометит его недоступным.
 */
export function normalizeCart(raw: unknown, catalog: Product[]): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const merged = new Map<string, CartItem>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const item = row as CartItem;
    if (typeof item.productId !== "string" || !item.productId || typeof item.size !== "string" || !item.size) continue;
    const qty = Number(item.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const key = cartLineKey(item);
    merged.set(key, {
      productId: item.productId,
      size: item.size,
      coating: typeof item.coating === "string" ? item.coating : undefined,
      qty: (merged.get(key)?.qty ?? 0) + qty,
    });
  }
  return [...merged.values()].flatMap((item) => {
    const product = bySlug.get(item.productId);
    if (!product) return [item];
    const qty = snapOrderQty(item.qty, product, { allowZero: true });
    return qty ? [{ ...item, qty }] : [];
  });
}

/** Корзина прототипа (ключ без версии, productId вида "p-atlant") → slug; неизвестные позиции отбрасываются. */
export function migrateLegacyCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row: Partial<CartItem> | null) => {
    const slug = row && typeof row.productId === "string" ? legacySlug(row.productId) : undefined;
    return slug ? [{ ...(row as CartItem), productId: slug }] : [];
  });
}

/** Избранное прототипа → slug; неизвестные id отбрасываются. */
export function migrateLegacyFavorites(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((id) => {
    const slug = typeof id === "string" ? legacySlug(id) : undefined;
    return slug ? [slug] : [];
  });
}
