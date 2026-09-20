const PROMO_LABELS = ["Скидка", "Хит", "Новинка", "Акция"] as const;

function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Заглушки промо-меток, пока нет данных из 1С. */
export function productPromoStub(product: { id: string }) {
  const h = hashId(product.id);
  return {
    label: PROMO_LABELS[h % PROMO_LABELS.length],
  };
}
