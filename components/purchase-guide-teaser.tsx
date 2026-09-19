"use client";

import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  purchaseGuidePoints,
  purchaseGuideSlides,
} from "@/lib/data/purchase-guide";
import { cn } from "@/lib/utils";

export function PurchaseGuideTeaser({
  className,
  compact = false,
  tone = "light",
}: {
  className?: string;
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  const cover = purchaseGuideSlides[0];
  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          "group flex cursor-pointer overflow-hidden rounded-2xl border text-left outline-none transition hover:border-orange/50 focus-visible:border-orange/50 focus-visible:ring-3 focus-visible:ring-orange/30",
          compact ? "items-center gap-3 p-2" : "gap-4 p-3",
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
          className={cn(
            "shrink-0 rounded-xl object-cover",
            compact ? "size-14" : "size-24 sm:size-28",
          )}
        />
        <div className={cn("min-w-0", compact ? "py-0" : "py-1")}>
          <p
            className={cn(
              "uppercase tracking-[0.16em] text-orange",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {compact ? "Гид закупщика" : "Гид закупщика · 10 слайдов"}
          </p>
          <p
            className={cn(
              "mt-1 font-heading leading-snug",
              compact ? "text-sm whitespace-nowrap" : "text-base",
              tone === "dark" ? "text-white" : "text-ink",
            )}
          >
            {compact ? "7 параметров до оплаты" : "7 параметров до оплаты партии"}
          </p>
          {compact ? null : (
            <p
              className={cn(
                "mt-1 line-clamp-2 text-sm",
                tone === "dark" ? "text-paper/70" : "text-steel",
              )}
            >
              Что проверить, прежде чем оплачивать крупную закупку СИЗ.
            </p>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              compact ? "mt-1 text-xs" : "mt-2 text-sm",
              tone === "dark" ? "text-white" : "text-ink",
            )}
          >
            {compact ? "Открыть" : "Смотреть гид"}
            <ArrowRight
              className={cn(
                "transition group-hover:translate-x-0.5",
                compact ? "size-3.5" : "size-4",
              )}
            />
          </span>
        </div>
      </DialogTrigger>
      <DialogContent className="max-h-[min(40rem,calc(100vh-2rem))] overflow-y-auto duration-200 sm:max-w-xl data-open:slide-in-from-bottom-2">
        <DialogHeader>
          <p className="text-[11px] uppercase tracking-[0.16em] text-orange">
            Гид закупщика
          </p>
          <DialogTitle className="font-heading text-xl leading-snug">
            7 параметров до оплаты партии
          </DialogTitle>
          <DialogDescription>
            Что проверить, прежде чем оплачивать крупную закупку СИЗ.
          </DialogDescription>
        </DialogHeader>
        <ol className="grid gap-2.5">
          {purchaseGuidePoints.map((point, index) => (
            <li key={point.title} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-orange/10 text-xs font-medium text-orange">
                {index + 1}
              </span>
              <span>
                <span className="font-medium text-ink">{point.title}.</span>{" "}
                <span className="text-steel">{point.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-steel">
          Правильная закупка начинается не с цены — с задачи производства.
        </p>
      </DialogContent>
    </Dialog>
  );
}
