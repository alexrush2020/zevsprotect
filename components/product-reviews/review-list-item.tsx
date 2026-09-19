import { ReviewShipmentMeta } from "@/components/product-reviews/review-shipment-meta";
import { StarRating } from "@/components/product-reviews/star-rating";
import { formatReviewDate, type ProductReview } from "@/lib/data/product-reviews";

export function ReviewListItem({ review }: { review: ProductReview }) {
  const initial = review.author.trim()[0]?.toUpperCase() ?? "?";

  return (
    <article id={review.id} className="scroll-mt-24 border-b border-border py-5 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <StarRating value={review.rating} />
        <div className="flex shrink-0 items-center gap-2.5">
          <p className="truncate text-right text-sm font-medium">{review.author}</p>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange/10 text-sm font-semibold text-orange"
            aria-hidden
          >
            {initial}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-4 text-xs">
        {review.recommends ? (
          <span className="inline-flex items-center gap-1 font-medium text-orange">
            <svg
              viewBox="0 0 12 12"
              className="h-3 w-3 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Рекомендует
          </span>
        ) : (
          <span aria-hidden />
        )}
        <span className="shrink-0 text-steel">{formatReviewDate(review.date)}</span>
      </div>

      <ReviewShipmentMeta
        orderDate={review.orderDate}
        shipped={review.shipped}
        shippedAt={review.shippedAt}
      />

      <p className="mt-3 text-sm leading-relaxed">{review.text}</p>

      {review.colorLabel || review.sizeLabel ? (
        <div className="mt-3 space-y-1">
          {review.colorLabel ? (
            <p className="text-xs text-steel">
              <span>Цвет: </span>
              {review.colorLabel}
            </p>
          ) : null}
          {review.sizeLabel ? (
            <p className="text-xs text-steel">
              <span>Размер: </span>
              {review.sizeLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
