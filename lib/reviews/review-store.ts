import {
  REVIEWS_UPDATED_EVENT,
  type ProductReview,
  type ReviewTopic,
} from "@/lib/data/product-reviews";

const STORAGE_KEY = "zp-user-reviews";

export type SubmitReviewInput = {
  productSlug: string;
  productTitle: string;
  author: string;
  rating: number;
  text: string;
  tags: ReviewTopic[];
  recommends?: boolean;
  colorLabel?: string;
  sizeLabel?: string;
};

function readRaw(): ProductReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ProductReview[]) : [];
  } catch {
    return [];
  }
}

export function submitUserReview(input: SubmitReviewInput): ProductReview {
  const today = new Date().toISOString().slice(0, 10);
  const review: ProductReview = {
    id: `ur-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productSlug: input.productSlug,
    productTitle: input.productTitle,
    author: input.author.trim() || "Закупщик",
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    text: input.text.trim(),
    colorLabel: input.colorLabel,
    sizeLabel: input.sizeLabel,
    date: today,
    orderDate: today,
    shipped: true,
    shippedAt: today,
    pendingModeration: true,
    tags: input.tags,
    recommends: input.recommends,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify([review, ...readRaw()]));
  window.dispatchEvent(new CustomEvent(REVIEWS_UPDATED_EVENT));
  return review;
}
