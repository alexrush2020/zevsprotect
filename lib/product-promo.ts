const PROMO_LABELS = ["Скидка", "Хит", "Новинка", "Акция"] as const;
const WHOLESALE_FROM = [50, 100, 200, 500] as const;

function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Заглушки промо и порога опта, пока нет данных из 1С. */
export function productPromoStub(product: { id: string }) {
  const h = hashId(product.id);
  return {
    label: PROMO_LABELS[h % PROMO_LABELS.length],
    wholesaleFrom: WHOLESALE_FROM[h % WHOLESALE_FROM.length],
  };
}
