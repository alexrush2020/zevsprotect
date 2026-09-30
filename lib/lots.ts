import { formatPairs } from "@/lib/order-qty";
import { formatVolumeQty, volumeUnitPrice } from "@/lib/volume-quote";
import type { CartItem, Product } from "@/lib/types";
import type { OrderLineView } from "@/lib/server/orders";

export { formatPairs };

export function catalogPrice(product: Pick<Product, "price">) {
  return product.price;
}

export function cartLineKey(item: Pick<CartItem, "productId" | "size" | "coating">) {
  return `${item.productId}-${item.size}-${item.coating ?? ""}`;
}

export function cartProductQty(items: CartItem[], productId: string) {
  return items
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + item.qty, 0);
}

export function cartLineTotal(
  product: Product,
  item: CartItem,
  productQty = item.qty,
) {
  return Math.round(volumeUnitPrice(product, productQty) * item.qty * 100) / 100;
}

/** Строки демо-заказа из localStorage по текущему каталогу (у заказа Payload строки — снапшот, см. toViewOrder). */
export function orderLinesFromCatalog(
  items: CartItem[],
  getProduct: (slug: string) => Product | undefined,
): OrderLineView[] {
  return items.flatMap((item) => {
    const p = getProduct(item.productId);
    if (!p) return [];
    const total = cartLineTotal(p, item, cartProductQty(items, item.productId));
    return [{
      key: cartLineKey(item),
      title: p.name,
      sku: p.sku,
      size: item.size,
      ...(item.coating ? { coating: item.coating } : {}),
      qty: item.qty,
      unit: p.unit,
      unitPrice: item.qty ? total / item.qty : p.price,
      total,
    }];
  });
}

export function cartLineCaption(product: Product, item: CartItem) {
  const coating = item.coating ? ` · ${item.coating}` : "";
  return `${product.sku} · размер ${item.size}${coating} · ${formatVolumeQty(item.qty, product.unit)}`;
}

export function cartLineOfferLabel(product: Product, item: CartItem) {
  return `× ${formatVolumeQty(item.qty, product.unit)}`;
}

export function groupCartByProduct(cart: CartItem[]) {
  const ids: string[] = [];
  const groups = new Map<string, CartItem[]>();
  for (const item of cart) {
    if (!groups.has(item.productId)) {
      ids.push(item.productId);
      groups.set(item.productId, []);
    }
    groups.get(item.productId)!.push(item);
  }
  return ids.map((productId) => ({
    productId,
    items: groups.get(productId)!,
  }));
}
