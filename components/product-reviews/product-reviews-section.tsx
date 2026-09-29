"use client";

import { useEffect, useState } from "react";
import { LeaveReviewButton } from "@/components/product-reviews/leave-review-button";
import { LeaveReviewModal } from "@/components/product-reviews/leave-review-modal";
import { ProductReviewsModal } from "@/components/product-reviews/product-reviews-modal";
import { ReviewCard } from "@/components/product-reviews/review-card";
import { ReviewListItem } from "@/components/product-reviews/review-list-item";
import { ReviewSummary } from "@/components/product-reviews/review-summary";
import {
  REVIEWS_UPDATED_EVENT,
  reviewsForOtherProducts,
  reviewsForProduct,
  reviewStats,
} from "@/lib/data/product-reviews";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export function ProductReviewsSection({ product }: { product: Product }) {
  const { user } = useStore();
  const [reviews, setReviews] = useState(() => reviewsForProduct(product.slug));
  const [allOpen, setAllOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const stats = reviewStats(product.slug);
  const otherReviews = reviewsForOtherProducts(product.slug);
  const author = user?.company || user?.name || "Закупщик";
  const sizeLabel = product.sizes[0];
  const leave = (
    <LeaveReviewButton productTitle={product.name} onClick={() => setLeaveOpen(true)} />
  );

  useEffect(() => {
    function refresh() {
      setReviews(reviewsForProduct(product.slug));
    }
    refresh();
    window.addEventListener(REVIEWS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(REVIEWS_UPDATED_EVENT, refresh);
  }, [product.slug]);

  useEffect(() => {
    function readHash() {
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      setAnchorId(hash && hash !== "reviews" ? hash : null);
    }
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [product.slug]);

  useEffect(() => {
    if (!anchorId) return;
    const match = reviews.find((review) => review.id === anchorId);
    if (!match) return;
    const inPreview = reviews.slice(0, 4).some((review) => review.id === anchorId);
    if (!inPreview) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- раскрытие списка по якорю из URL
      setAllOpen(true);
      return;
    }
    const timer = window.setTimeout(() => {
      document.getElementById(anchorId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [anchorId, reviews]);

  return (
    <>
      {stats.count === 0 ? (
        <section
          id="reviews"
          className="mt-12 scroll-mt-24 rounded-2xl border bg-card p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-heading text-2xl">Оставите первый отзыв?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
                У этого товара пока нет отзывов, поэтому посмотрите отзывы на другие
                наши товары:
              </p>
            </div>
            {leave}
          </div>
          <div className="mt-6 grid auto-rows-fr items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {otherReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
      ) : (
        <section
          id="reviews"
          className="mt-12 scroll-mt-24 rounded-2xl border bg-card p-6"
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
            <div>
              <ReviewSummary stats={stats} />
              <div className="mt-5">{leave}</div>
            </div>
            <div>
              {reviews.slice(0, 4).map((review) => (
                <ReviewListItem key={review.id} review={review} />
              ))}
              <button
                type="button"
                onClick={() => setAllOpen(true)}
                className="mt-2 inline-flex h-11 items-center justify-center rounded-xl border-2 border-orange px-5 text-[13px] font-semibold uppercase tracking-wide text-orange transition hover:bg-orange hover:text-white"
              >
                Смотреть все отзывы о товаре
              </button>
            </div>
          </div>
        </section>
      )}
      <LeaveReviewModal
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        productSlug={product.slug}
        productTitle={product.name}
        author={author}
        colorLabel={product.color}
        sizeLabel={sizeLabel}
      />
      <ProductReviewsModal
        slug={product.slug}
        productTitle={product.name}
        open={allOpen}
        onOpenChange={setAllOpen}
        anchorReviewId={anchorId}
      />
    </>
  );
}
