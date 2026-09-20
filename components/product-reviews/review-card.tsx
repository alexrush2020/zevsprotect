import Link from "next/link";
import { ReviewCardExcerpt } from "@/components/product-reviews/review-card-excerpt";
import { ReviewShipmentMeta } from "@/components/product-reviews/review-shipment-meta";
import { StarRating } from "@/components/product-reviews/star-rating";
import { formatReviewDate, type ProductReview } from "@/lib/data/product-reviews";

export function ReviewCard({ review }: { review: ProductReview }) {
  const photos = review.photos ?? [];

  return (
    <article className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-paper/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel">
        Отзыв о товаре
      </p>
      <Link
        href={`/product/${review.productSlug}`}
        className="mt-1 line-clamp-2 min-h-12 font-heading text-base hover:text-orange hover:underline"
      >
        {review.productTitle}
      </Link>
      <div className="mt-3 h-20">
        {photos.length ? (
          <div className="flex h-20 gap-2 overflow-x-auto">
            {photos.map((src, i) => (
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
      </div>
      <ReviewCardExcerpt
        text={review.text}
        href={`/product/${review.productSlug}#${review.id}`}
      />
      <div className="mt-auto grid shrink-0 grid-rows-[1.5rem_1rem_1rem_2rem_1rem] gap-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium">{review.author}</p>
          <StarRating value={review.rating} />
        </div>
        <p className="truncate text-xs leading-4 text-steel">
          {review.colorLabel ? (
            <>
              <span>Цвет: </span>
              {review.colorLabel}
            </>
          ) : (
            "\u00a0"
          )}
        </p>
        <p className="truncate text-xs leading-4 text-steel">
          {review.sizeLabel ? (
            <>
              <span>Размер: </span>
              {review.sizeLabel}
            </>
          ) : (
            "\u00a0"
          )}
        </p>
        <ReviewShipmentMeta
          orderDate={review.orderDate}
          shipped={review.shipped}
          shippedAt={review.shippedAt}
          compact
        />
        <p className="text-xs leading-4 text-steel">{formatReviewDate(review.date)}</p>
      </div>
    </article>
  );
}
