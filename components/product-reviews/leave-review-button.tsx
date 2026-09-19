"use client";

import { cn } from "@/lib/utils";

export function LeaveReviewButton({
  productTitle,
  onClick,
  className,
}: {
  productTitle: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 shrink-0 items-center justify-center rounded-xl border-2 border-orange px-5 text-[13px] font-semibold uppercase tracking-wide text-orange transition hover:bg-orange hover:text-white",
        className,
      )}
      aria-label={`Оставить отзыв: ${productTitle}`}
    >
      Оставить отзыв
    </button>
  );
}
