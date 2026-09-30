"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { ReviewListItem } from "@/components/product-reviews/review-list-item";
import { ReviewSummary } from "@/components/product-reviews/review-summary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  REVIEWS_UPDATED_EVENT,
  customerPhotos,
  filterAndSortReviews,
  reviewStats,
  reviewsForProduct,
  topicLabels,
  type ProductReview,
  type ReviewSort,
  type ReviewTopic,
} from "@/lib/data/product-reviews";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: "recommended", label: "Рекомендуемые" },
  { value: "newest", label: "Сначала новые" },
  { value: "positive", label: "Положительные" },
  { value: "negative", label: "Отрицательные" },
];

export function ProductReviewsModal({
  slug,
  approved,
  productTitle,
  open,
  onOpenChange,
  anchorReviewId,
}: {
  slug: string;
  approved: ProductReview[];
  productTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorReviewId?: string | null;
}) {
  const [sort, setSort] = useState<ReviewSort>("recommended");
  const [topic, setTopic] = useState<ReviewTopic | null>(null);
  const [tick, setTick] = useState(0);

  const allReviews = useMemo(() => reviewsForProduct(slug, approved), [slug, approved, tick]);
  const stats = useMemo(() => reviewStats(slug, approved), [slug, approved, tick]);
  const filtered = useMemo(
    () => filterAndSortReviews(allReviews, { topic, sort }),
    [allReviews, topic, sort],
  );
  const photos = useMemo(() => customerPhotos(allReviews), [allReviews]);
  const topics = (Object.keys(topicLabels) as ReviewTopic[]).filter(
    (key) => (stats.tagCounts[key] ?? 0) > 0,
  );

  useEffect(() => {
    function onUpdate() {
      setTick((n) => n + 1);
    }
    window.addEventListener(REVIEWS_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(REVIEWS_UPDATED_EVENT, onUpdate);
  }, []);

  useEffect(() => {
    if (!open || !anchorReviewId) return;
    const id = anchorReviewId;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open, anchorReviewId, filtered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-8">
            Отзывы на этот товар ({stats.count})
          </DialogTitle>
        </DialogHeader>

        <ReviewSummary title="" stats={stats} />

        <div className="mt-5">
          <ReviewSortSelect value={sort} onChange={setSort} />
        </div>

        {topics.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip active={topic === null} onClick={() => setTopic(null)}>
              Все
            </Chip>
            {topics.map((key) => (
              <Chip key={key} active={topic === key} onClick={() => setTopic(key)}>
                {topicLabels[key]} ({stats.tagCounts[key]})
              </Chip>
            ))}
          </div>
        ) : null}

        {photos.length ? (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-steel">
              Фото к отзывам
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map(({ src, reviewId }, index) => (
                <button
                  key={`${reviewId}-${index}`}
                  type="button"
                  onClick={() =>
                    document.getElementById(reviewId)?.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                    })
                  }
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border transition hover:border-orange"
                  aria-label="Перейти к отзыву с этим фото"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          {filtered.length ? (
            filtered.map((review) => <ReviewListItem key={review.id} review={review} />)
          ) : (
            <p className="py-8 text-center text-sm text-steel">
              Нет отзывов по выбранным фильтрам.
            </p>
          )}
        </div>

        <Button variant="outline" className="mt-2 h-10" onClick={() => onOpenChange(false)}>
          Закрыть
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ReviewSortSelect({
  value,
  onChange,
}: {
  value: ReviewSort;
  onChange: (value: ReviewSort) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((option) => option.value === value)?.label ?? "";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex max-w-xs flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel">
        Сортировка
      </span>
      <button
        type="button"
        aria-label="Сортировка отзывов"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className="flex h-9 w-full items-center justify-between rounded-full border border-border bg-card px-3 text-sm outline-none transition focus:border-orange"
      >
        {current}
        <ChevronDown
          className={cn("size-4 text-steel transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-md"
        >
          {SORT_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={cn(
                  "flex w-full rounded-full px-3 py-1.5 text-left text-sm transition",
                  option.value === value
                    ? "bg-orange text-white"
                    : "text-ink hover:bg-orange/10",
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-orange bg-orange text-white"
          : "border-border bg-card text-ink hover:border-orange/50",
      )}
    >
      {children}
    </button>
  );
}
