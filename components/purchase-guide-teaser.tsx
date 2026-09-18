import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  PURCHASE_GUIDE_SLUG,
  purchaseGuideSlides,
} from "@/lib/data/purchase-guide";
import { cn } from "@/lib/utils";

export function PurchaseGuideTeaser({
  className,
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const cover = purchaseGuideSlides[0];
  return (
    <Link
      href={`/blog/${PURCHASE_GUIDE_SLUG}`}
      className={cn(
        "group flex gap-4 overflow-hidden rounded-2xl border p-3 transition hover:border-orange/50",
        tone === "dark"
          ? "border-white/10 bg-white/5 hover:bg-white/10"
          : "bg-card hover:shadow-sm",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cover.src}
        alt=""
        className="size-24 shrink-0 rounded-xl object-cover sm:size-28"
      />
      <div className="min-w-0 py-1">
        <p
          className={cn(
            "text-[11px] uppercase tracking-[0.16em]",
            tone === "dark" ? "text-orange" : "text-orange",
          )}
        >
          Гид закупщика · 10 слайдов
        </p>
        <p
          className={cn(
            "mt-1 font-heading text-base leading-snug",
            tone === "dark" ? "text-white" : "text-ink",
          )}
        >
          7 параметров до оплаты партии
        </p>
        <p
          className={cn(
            "mt-1 line-clamp-2 text-sm",
            tone === "dark" ? "text-paper/70" : "text-steel",
          )}
        >
          Что проверить, прежде чем оплачивать крупную закупку СИЗ.
        </p>
        <span
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-sm font-medium",
            tone === "dark" ? "text-white" : "text-ink",
          )}
        >
          Смотреть гид
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
