import type { Product } from "@/lib/types";

export function formatPairs(qty: number) {
  const n = Math.abs(qty) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return `${qty} пар`;
  if (n1 === 1) return `${qty} пара`;
  if (n1 >= 2 && n1 <= 4) return `${qty} пары`;
  return `${qty} пар`;
}

const DIPPED_COATINGS = new Set([
  "Латекс",
  "Нитрил",
  "Полиуретан",
  "Вспененный латекс",
  "Рифленый латекс",
]);

export type OrderQtyProduct = Pick<Product, "minQty" | "coating" | "coatingType" | "unit">;

export function isDippedCoating(product: Pick<Product, "coating" | "coatingType">) {
  const type = (product.coatingType ?? "").toLowerCase();
  if (type.includes("облив")) return true;
  return DIPPED_COATINGS.has(product.coating);
}

export function productOrderStep(product: OrderQtyProduct) {
  if (product.unit !== "пара") return Math.max(1, product.minQty);
  return isDippedCoating(product) ? 12 : 50;
}

export function productMinQty(product: OrderQtyProduct) {
  const step = productOrderStep(product);
  return Math.max(step, product.minQty);
}

export function snapOrderQty(
  qty: number,
  product: OrderQtyProduct,
  options?: { allowZero?: boolean },
) {
  const min = productMinQty(product);
  const step = productOrderStep(product);
  if (!Number.isFinite(qty) || qty <= 0) return options?.allowZero ? 0 : min;
  return Math.max(min, Math.ceil(qty / step) * step);
}
