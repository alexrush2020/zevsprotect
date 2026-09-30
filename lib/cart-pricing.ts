import { legacySlug } from "@/lib/legacy-product-ids";
import { cartLineKey } from "@/lib/lots";
import { snapOrderQty } from "@/lib/order-qty";
import { splitVat } from "@/lib/vat";
import { volumeUnitPrice } from "@/lib/volume-quote";
import type { CartItem, Product } from "@/lib/types";

/**
 * Пересчёт корзины по каталогу (Payload). Чистая функция: клиент (lib/store.tsx) и сервер
 * (оформление заказа, SH-CHK) считают одинаково, цене и количеству из клиента не доверяем.
 * - productId позиции — slug товара; нет в каталоге → available:false, в сумму не входит.
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
    if (row.product) productQty.set(row.productId, (productQty.get(row.productId) ?? 0) + row.qty);
  }
  let goods = 0;
  for (const [slug, qty] of productQty) {
    goods += roundMoney(volumeUnitPrice(bySlug.get(slug)!, qty) * qty);
  }
  const lines: PricedCartLine[] = rows.map((row) => {
    if (!row.product) return { ...row, available: false, unitPrice: 0, total: 0 };
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
