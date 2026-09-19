import Link from "next/link";
import { ReviewShipmentMeta } from "@/components/product-reviews/review-shipment-meta";
import { StarRating } from "@/components/product-reviews/star-rating";
import { formatReviewDate, type ProductReview } from "@/lib/data/product-reviews";

export function ReviewCard({ review }: { review: ProductReview }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-paper/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel">
        Отзыв о товаре
      </p>
      <Link
        href={`/product/${review.productSlug}`}
        className="mt-1 font-heading text-base hover:text-orange hover:underline"
      >
        {review.productTitle}
      </Link>
      {review.photos?.length ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.photos.map((src, i) => (
            <div
              key={src}
              className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Фото от ${review.author}, ${i + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ) : null}
      <p className="mt-3 flex-1 text-sm leading-relaxed text-steel">{review.text}</p>
      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{review.author}</p>
          <StarRating value={review.rating} />
        </div>
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
        <ReviewShipmentMeta
          orderDate={review.orderDate}
          shipped={review.shipped}
          shippedAt={review.shippedAt}
          compact
        />
        <p className="text-xs text-steel">{formatReviewDate(review.date)}</p>
      </div>
    </article>
  );
}
