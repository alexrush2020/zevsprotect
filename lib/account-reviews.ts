import { demoAccount } from "@/lib/demo-account";
import { sampleProductReviews, type ProductReview } from "@/lib/data/product-reviews";
import type { UserProfile } from "@/lib/types";

const demoReviews: ProductReview[] = [
  {
    id: "ar-roststroy-atlant",
    productSlug: "atlant",
    productTitle: "Перчатки «Атлант»",
    author: "ООО «РостСтрой»",
    rating: 5,
    text: "Партия на склад Ростова пришла ровно, размер L без расхождений. Берём повторно.",
    colorLabel: "Синий",
    sizeLabel: "L",
    date: "2026-08-28",
    orderDate: "2026-08-21",
    shipped: true,
    shippedAt: "2026-08-22",
    tags: ["quality", "shipment"],
    recommends: true,
  },
  {
    id: "ar-roststroy-frost",
    productSlug: "frost-strong-vl-3-4",
    productTitle: "Перчатки «Фрост Стронг-ВЛ 3/4»",
    author: "ООО «РостСтрой»",
    rating: 4,
    text: "На холоде держат, упаковка целая. Для следующей поставки возьмём больше XL.",
    sizeLabel: "L",
    date: "2026-08-29",
    orderDate: "2026-08-21",
    shipped: true,
    shippedAt: "2026-08-22",
    tags: ["grip", "pack"],
    recommends: true,
  },
];

/** submitted — свои отзывы на модерации с сервера (myPendingReviews). */
export function reviewsForAccount(user: UserProfile, submitted: ProductReview[] = []): ProductReview[] {
  const names = [user.company, user.name].filter(Boolean);
  const catalog = sampleProductReviews.filter((r) => names.includes(r.author));
  const demo = user.email === demoAccount.email ? demoReviews : [];
  const seen = new Set<string>();
  return [...submitted, ...demo, ...catalog].filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
