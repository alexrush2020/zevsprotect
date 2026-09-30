export type ReviewTopic = "quality" | "shipment" | "grip" | "size" | "pack";

export const topicLabels: Record<ReviewTopic, string> = {
  quality: "Качество партии",
  shipment: "Сроки отгрузки",
  grip: "Хват",
  size: "Размер",
  pack: "Упаковка",
};

export type ProductReview = {
  id: string;
  productSlug: string;
  productTitle: string;
  author: string;
  rating: number;
  text: string;
  colorLabel?: string;
  sizeLabel?: string;
  date: string;
  orderDate: string;
  shipped: boolean;
  shippedAt?: string;
  pendingModeration?: boolean;
  tags: ReviewTopic[];
  recommends?: boolean;
  photos?: string[];
};

export type ReviewSort = "recommended" | "newest" | "positive" | "negative";

export const REVIEWS_UPDATED_EVENT = "zp-reviews-updated";

const feniksPhoto =
  "https://zevsprotect.ru/wp-content/uploads/2026/05/perchatki-arselonovye-zharoprochnye-bez-pvh.jpg";
const optimaPhoto =
  "https://zevsprotect.ru/wp-content/uploads/2026/09/gemini_generated_image_w8pa75w8pa75w8pa.jpeg";
const atlantPhoto =
  "https://zevsprotect.ru/wp-content/uploads/2026/08/atlant-10-kl-sinie-2.png";

export const sampleProductReviews: ProductReview[] = [
  {
    id: "r-feniks-1",
    productSlug: "feniks",
    productTitle: "Перчатки «Феникс»",
    author: "ООО «Анод»",
    rating: 5,
    text: "Стабильность поставок и качество партий. Менеджеры решают расхождения по артикулам в тот же день, без «перезвоним».",
    colorLabel: "Оранжевый",
    sizeLabel: "XL",
    date: "2026-03-12",
    orderDate: "2026-02-27",
    shipped: true,
    shippedAt: "2026-03-06",
    tags: ["quality", "shipment"],
    recommends: true,
    photos: [feniksPhoto],
  },
  {
    id: "r-feniks-2",
    productSlug: "feniks",
    productTitle: "Перчатки «Феникс»",
    author: "ГК «Ланмар»",
    rating: 5,
    text: "Берём на горячие участки. Можно нанести логотип, цена держится при регулярном объёме.",
    colorLabel: "Оранжевый",
    sizeLabel: "XL",
    date: "2026-05-18",
    orderDate: "2026-05-04",
    shipped: true,
    shippedAt: "2026-05-15",
    tags: ["quality", "pack"],
    recommends: true,
  },
  {
    id: "r-feniks-3",
    productSlug: "feniks",
    productTitle: "Перчатки «Феникс»",
    author: "Севстальснаб",
    rating: 4,
    text: "Хват на горячем металле уверенный, палец не скользит. Пара чуть тяжелее, чем ждали по описанию — для длинной смены чувствуется.",
    colorLabel: "Оранжевый",
    sizeLabel: "XL",
    date: "2026-07-09",
    orderDate: "2026-06-25",
    shipped: true,
    shippedAt: "2026-07-06",
    tags: ["grip", "quality"],
    recommends: true,
    photos: [feniksPhoto],
  },
  {
    id: "r-feniks-4",
    productSlug: "feniks",
    productTitle: "Перчатки «Феникс»",
    author: "Донтехмонтаж",
    rating: 5,
    text: "По срочной партии сразу сказали, реально это или нет. Отгрузили в обещанный день, размер XL сел по цеху без пересорта.",
    colorLabel: "Оранжевый",
    sizeLabel: "XL",
    date: "2026-08-21",
    orderDate: "2026-08-11",
    shipped: true,
    shippedAt: "2026-08-18",
    tags: ["shipment", "size"],
    recommends: true,
  },
  {
    id: "r-optima-1",
    productSlug: "optima",
    productTitle: "Перчатки «Оптима»",
    author: "Югметалл",
    rating: 5,
    text: "Базовая ХБ на склад: берём тысячами, партии ровные, ПВХ-рисунок не осыпается после первой недели.",
    colorLabel: "Серый",
    sizeLabel: "L",
    date: "2026-04-02",
    orderDate: "2026-03-18",
    shipped: true,
    shippedAt: "2026-03-28",
    tags: ["quality", "pack"],
    recommends: true,
    photos: [optimaPhoto],
  },
  {
    id: "r-optima-2",
    productSlug: "optima",
    productTitle: "Перчатки «Оптима»",
    author: "ООО «Прибой»",
    rating: 4,
    text: "Цена и фасовка удобные. Размер M на части смены маловат — в следующей заявке сразу пропишем L.",
    colorLabel: "Серый",
    sizeLabel: "M",
    date: "2026-06-14",
    orderDate: "2026-05-30",
    shipped: true,
    shippedAt: "2026-06-11",
    tags: ["size", "shipment"],
    recommends: true,
  },
  {
    id: "r-atlant-1",
    productSlug: "atlant",
    productTitle: "Перчатки «Атлант»",
    author: "ГК «Ланмар»",
    rating: 5,
    text: "Синие пары удобно делить по участкам. Плотнее обычной ХБ, хват после масла ещё держится.",
    colorLabel: "Синий",
    sizeLabel: "L",
    date: "2026-05-22",
    orderDate: "2026-05-08",
    shipped: true,
    shippedAt: "2026-05-19",
    tags: ["grip", "quality"],
    recommends: true,
    photos: [atlantPhoto],
  },
];

/**
 * Свои отзывы автора на модерации — с сервера (myPendingReviews: сессия клиента / подписанная cookie),
 * не из localStorage: подделать чужой «на модерации» нельзя. Видны только автору, сверху списка.
 */
let pendingReviews: ProductReview[] = [];

export function setPendingReviews(list: ProductReview[]) {
  pendingReviews = list;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(REVIEWS_UPDATED_EVENT));
}

export function listPendingReviews(): ProductReview[] {
  return pendingReviews;
}

/** base — одобренные отзывы (с сервера, Payload); мок — по умолчанию. Локальные отзывы автора (на модерации) — сверху. */
export function allProductReviews(base: ProductReview[] = sampleProductReviews): ProductReview[] {
  return [...pendingReviews, ...base];
}

export function reviewsForProduct(slug: string, base?: ProductReview[]): ProductReview[] {
  return allProductReviews(base)
    .filter((review) => review.productSlug === slug)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function reviewStats(slug: string, base?: ProductReview[]) {
  const list = reviewsForProduct(slug, base);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
    1 | 2 | 3 | 4 | 5,
    number
  >;
  const tagCounts: Partial<Record<ReviewTopic, number>> = {};
  if (list.length === 0) {
    return { average: 0, count: 0, distribution, tagCounts };
  }
  let sum = 0;
  for (const review of list) {
    const star = Math.min(5, Math.max(1, Math.round(review.rating))) as
      | 1
      | 2
      | 3
      | 4
      | 5;
    distribution[star] += 1;
    sum += review.rating;
    for (const tag of review.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  return {
    average: Math.round((sum / list.length) * 10) / 10,
    count: list.length,
    distribution,
    tagCounts,
  };
}

export function filterAndSortReviews(
  reviews: ProductReview[],
  opts: {
    topic?: ReviewTopic | null;
    sort: ReviewSort;
  },
): ProductReview[] {
  let list = [...reviews];
  if (opts.topic) list = list.filter((review) => review.tags.includes(opts.topic!));

  if (opts.sort === "positive") {
    list = list.filter((review) => review.rating >= 4);
    list.sort((a, b) => b.date.localeCompare(a.date));
  } else if (opts.sort === "negative") {
    list = list.filter((review) => review.rating <= 3);
    list.sort((a, b) => b.date.localeCompare(a.date));
  } else if (opts.sort === "recommended") {
    list.sort((a, b) => {
      const ra = a.recommends ? 1 : 0;
      const rb = b.recommends ? 1 : 0;
      if (rb !== ra) return rb - ra;
      return b.date.localeCompare(a.date);
    });
  } else {
    list.sort((a, b) => b.date.localeCompare(a.date));
  }
  return list;
}

export function customerPhotos(reviews: ProductReview[]) {
  return reviews.flatMap((review) =>
    (review.photos ?? []).map((src) => ({ src, reviewId: review.id })),
  );
}

export function reviewsForOtherProducts(
  excludeSlug: string,
  limit = 3,
  base?: ProductReview[],
): ProductReview[] {
  return allProductReviews(base)
    .filter((review) => review.productSlug !== excludeSlug)
    .slice(0, limit);
}

export function formatReviewDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function reviewCountLabel(count: number): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return `${count} отзывов`;
  if (n1 === 1) return `${count} отзыв`;
  if (n1 >= 2 && n1 <= 4) return `${count} отзыва`;
  return `${count} отзывов`;
}
