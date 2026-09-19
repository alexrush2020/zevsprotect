import { formatPrice } from "@/lib/format";
import type { CartItem, PackType, Product, ProductLot } from "@/lib/types";

export const PACK_TYPE_LABEL: Record<PackType, string> = {
  komplekt: "Комплект",
  meshok: "Мешок",
  press: "Пресс",
};

const SMALL_TYPES: PackType[] = ["komplekt"];
const LARGE_TYPES: PackType[] = ["meshok", "press"];

export function hasLots<T extends Pick<Product, "lots">>(
  product: T,
): product is T & { lots: ProductLot[] } {
  return Boolean(product.lots?.length);
}

export function catalogPrice(product: Pick<Product, "price" | "lots">) {
  if (!product.lots?.length) return product.price;
  return Math.min(...product.lots.map((lot) => lot.price));
}

export function formatPairs(qty: number) {
  const n = Math.abs(qty) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return `${qty} пар`;
  if (n1 === 1) return `${qty} пара`;
  if (n1 >= 2 && n1 <= 4) return `${qty} пары`;
  return `${qty} пар`;
}

export function lotVolumePrice(lot: ProductLot) {
  return lot.pairs * lot.price;
}

export function formatLotVolume(lot: ProductLot) {
  return `${PACK_TYPE_LABEL[lot.type]} · ${formatPairs(lot.pairs)}`;
}

export function formatLotPrices(lot: ProductLot) {
  return `${formatPrice(lotVolumePrice(lot))} · ${formatPrice(lot.price)}/пара`;
}

export function getLot(product: Pick<Product, "lots"> | undefined, lotId?: string) {
  if (!product || !lotId) return undefined;
  return product.lots?.find((lot) => lot.id === lotId);
}

export function teaserLots(lots: ProductLot[]): ProductLot[] {
  if (lots.length <= 2) {
    return [...lots].sort((a, b) => a.pairs - b.pairs);
  }

  const small =
    lots
      .filter((lot) => SMALL_TYPES.includes(lot.type))
      .sort((a, b) => a.pairs - b.pairs)[0] ??
    [...lots].sort((a, b) => a.pairs - b.pairs)[0];

  const largeCandidates = lots.filter((lot) => lot.id !== small.id);
  const largeTyped = largeCandidates
    .filter((lot) => LARGE_TYPES.includes(lot.type))
    .sort((a, b) => b.pairs - a.pairs)[0];
  const large =
    largeTyped ??
    [...largeCandidates].sort((a, b) => b.pairs - a.pairs)[0];

  return [small, large].filter((lot, index, list) => {
    return Boolean(lot) && list.findIndex((item) => item.id === lot.id) === index;
  });
}

export function cartLineKey(item: Pick<CartItem, "productId" | "size" | "lotId">) {
  return `${item.productId}-${item.size}-${item.lotId ?? "unit"}`;
}

export function cartLineTotal(product: Product, item: CartItem) {
  const lot = getLot(product, item.lotId);
  if (lot) return lot.price * item.qty;
  return product.price * item.qty;
}

export function cartLineCaption(product: Product, item: CartItem) {
  const lot = getLot(product, item.lotId);
  if (!lot) return `${product.sku} · размер ${item.size}`;
  const packs = item.packCount ?? 0;
  return `${product.sku} · размер ${item.size} · ${formatLotVolume(lot)} × ${packs} уп.`;
}

export function cartLineOfferLabel(product: Product, item: CartItem) {
  const lot = getLot(product, item.lotId);
  if (!lot) return `× ${item.qty}`;
  return `${formatLotVolume(lot)} × ${item.packCount ?? 0} уп.`;
}
