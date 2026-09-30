"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { purchaseGuideSlides } from "@/lib/data/purchase-guide";

type Slide = { src: string; title: string; alt: string };

export function PurchaseGuideCarousel({
  className,
  slides = purchaseGuideSlides,
}: {
  className?: string;
  slides?: readonly Slide[];
}) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const slide = slides[index];
  const total = slides.length;

  function go(next: number) {
    setIndex((next + total) % total);
  }

  return (
    <div
      className={cn("mx-auto w-full max-w-3xl outline-none", className)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go(index + 1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(index - 1);
        }
      }}
    >
      <div
        className="overflow-hidden rounded-2xl border bg-card shadow-sm"
        onPointerDown={(e) => {
          startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current == null) return;
          const dx = e.clientX - startX.current;
          if (dx > 50) go(index - 1);
          if (dx < -50) go(index + 1);
          startX.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.src}
          alt={slide.alt}
          className="aspect-square w-full object-cover"
          draggable={false}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => go(index - 1)}
          aria-label="Предыдущий слайд"
        >
          <ChevronLeft />
        </Button>
        <div className="flex flex-wrap justify-center gap-1.5">
          {slides.map((item, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Слайд ${i + 1}: ${item.title}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "size-2.5 rounded-full transition",
                i === index ? "bg-orange" : "bg-border hover:bg-steel/40",
              )}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => go(index + 1)}
          aria-label="Следующий слайд"
        >
          <ChevronRight />
        </Button>
      </div>
      <p className="mt-3 text-center font-heading text-lg leading-snug" aria-live="polite">
        {slide.title}
      </p>
      {slides.map((item, i) =>
        Math.abs(i - index) === 1 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={item.src} alt="" className="hidden" />
        ) : null,
      )}
    </div>
  );
}
