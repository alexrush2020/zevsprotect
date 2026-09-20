"use client";

import type { CSSProperties } from "react";
import { QtyInput } from "@/components/qty-stepper";
import { formatPrice } from "@/lib/format";
import {
  formatShiftCount,
  formatVolumeQty,
  quoteVolume,
  snapVolumeQty,
  type VolumeQuote,
} from "@/lib/volume-quote";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductVolumePrice({
  product,
  qty,
  onQtyChange,
  variant = "card",
  showShift = true,
}: {
  product: Product;
  qty: number;
  onQtyChange: (qty: number) => void;
  variant?: "card" | "shop";
  showShift?: boolean;
}) {
  const quote = quoteVolume(product, qty);
  const shop = variant === "shop";

  return (
    <div
      className={cn("product-volume-price", shop && "product-volume-price--shop")}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-end justify-between gap-2">
        <p
          className={cn(
            "min-w-0 tabular-nums",
            shop
              ? "text-sm text-white/80"
              : "truncate text-lg font-semibold leading-none",
          )}
        >
          {formatPrice(quote.unitPrice)}
          <span
            className={cn(
              shop ? "ml-1 text-xs text-white/40" : "ml-1 text-xs font-normal text-steel",
            )}
          >
            / {product.unit}
          </span>
        </p>
        {shop ? (
          quote.discountPct > 0 ? (
            <span className="shrink-0 text-[11px] tabular-nums text-orange">
              −{quote.discountPct}%
            </span>
          ) : null
        ) : (
          <p className="shrink-0 text-right text-xs leading-none text-steel">
            {product.stock > 0
              ? `в наличии · ${product.stock.toLocaleString("ru-RU")}`
              : "под заказ"}
          </p>
        )}
      </div>

      {showShift ? (
        <div
          className={cn(
            "mt-1 flex items-baseline justify-between gap-2",
            shop ? "text-[11px] text-white/55" : "text-xs text-steel",
          )}
        >
          <p className={cn("tabular-nums", shop ? "text-white/80" : "text-ink")}>
            {formatPrice(quote.perShift)}
            <span className={cn("ml-1 font-normal", shop ? "text-white/40" : "text-steel")}>
              / смену · {formatShiftCount(quote.shifts)}
            </span>
          </p>
          {!shop && quote.discountPct > 0 ? (
            <span className="shrink-0 tabular-nums text-orange">−{quote.discountPct}%</span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "mt-1 flex min-w-0 items-baseline gap-1 tabular-nums",
          shop ? "text-[11px] text-white/45" : "text-xs text-steel",
        )}
      >
        <QtyInput
          product={product}
          qty={qty}
          onQtyChange={onQtyChange}
          className="product-volume-qty-input"
        />
        <span className="shrink-0">{product.unit === "пара" ? "пар" : product.unit}</span>
        <span className="shrink-0">·</span>
        <span className="shrink-0">{formatPrice(quote.total)}</span>
        {quote.next ? (
          <span className="min-w-0 truncate">
            <span className="mx-1">·</span>
            ещё {formatVolumeQty(quote.next.qty - quote.qty, product.unit)} до {quote.next.label}
          </span>
        ) : quote.discountPct > 0 ? (
          <span className="shrink-0">
            <span className="mx-1">·</span>
            {quote.label}
          </span>
        ) : null}
      </div>

      <VolumeDiscountTracker product={product} qty={qty} onQtyChange={onQtyChange} />
    </div>
  );
}

export function VolumeDiscountTracker({
  product,
  qty,
  onQtyChange,
}: {
  product: Product;
  qty: number;
  onQtyChange: (qty: number) => void;
}) {
  const quote = quoteVolume(product, qty);
  const sliderQty = Math.min(quote.max, Math.max(quote.min, quote.qty));
  const fill =
    quote.max === quote.min ? 0 : ((sliderQty - quote.min) / (quote.max - quote.min)) * 100;

  return (
    <VolumeSlider
      product={product}
      quote={quote}
      fill={fill}
      sliderQty={sliderQty}
      onQtyChange={onQtyChange}
    />
  );
}

function VolumeSlider({
  product,
  quote,
  fill,
  sliderQty,
  onQtyChange,
}: {
  product: Product;
  quote: VolumeQuote;
  fill: number;
  sliderQty: number;
  onQtyChange: (qty: number) => void;
}) {
  const span = quote.max - quote.min;
  const marks = quote.ticks.filter(
    (tick) => tick.discountPct > 0 && tick.qty > quote.min && tick.qty <= quote.max,
  );

  function markLeft(qty: number) {
    if (span <= 0) return 0;
    return ((qty - quote.min) / span) * 100;
  }

  return (
    <div
      className="product-volume-slider-wrap"
      style={{ "--volume-fill": fill } as CSSProperties}
    >
      <div className="product-volume-slider-track">
        <span className="product-volume-slider-fill" />
        <div className="product-volume-slider-marks">
          {marks.map((mark) => {
            const reached = quote.qty >= mark.qty;
            return (
              <button
                key={mark.qty}
                type="button"
                className={cn("product-volume-slider-mark", reached && "is-reached")}
                style={{ left: `${markLeft(mark.qty)}%` }}
                aria-label={`${mark.label} от ${formatVolumeQty(mark.qty, product.unit)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onQtyChange(snapVolumeQty(product, mark.qty));
                }}
              />
            );
          })}
        </div>
        <input
          type="range"
          className="product-volume-slider"
          min={quote.min}
          max={quote.max}
          step={quote.step}
          value={sliderQty}
          aria-label="Объём партии"
          aria-valuetext={`${formatVolumeQty(quote.qty, product.unit)}, ${formatPrice(quote.unitPrice)} за ${product.unit}`}
          onChange={(e) => onQtyChange(snapVolumeQty(product, Number(e.target.value)))}
        />
      </div>
      <div className="product-volume-slider-ticks">
        {marks.map((mark) => {
          const left = markLeft(mark.qty);
          const edge = left < 8 ? "is-start" : left > 92 ? "is-end" : "";
          return (
            <button
              key={mark.qty}
              type="button"
              className={cn(
                "product-volume-slider-mark-label",
                edge,
                quote.qty >= mark.qty && "is-reached",
              )}
              style={{ left: `${left}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onQtyChange(snapVolumeQty(product, mark.qty));
              }}
            >
              {mark.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
