import { formatPrice } from "@/lib/format";
import {
  catalogPrice,
  formatLotPrices,
  formatLotVolume,
  hasLots,
  teaserLots,
} from "@/lib/lots";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductLotTeaser({
  product,
  variant = "card",
}: {
  product: Product;
  variant?: "card" | "shop";
}) {
  if (!hasLots(product)) return null;
  const teasers = teaserLots(product.lots);
  const shop = variant === "shop";

  return (
    <div className={cn("mt-2 grid gap-1", shop ? "text-[11px]" : "text-xs")}>
      {teasers.map((lot) => (
        <div
          key={lot.id}
          className={cn(
            shop
              ? "grid gap-0.5 leading-snug text-white/55"
              : "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 leading-snug text-steel",
          )}
        >
          <span className={cn("min-w-0", shop ? "truncate text-white/70" : "truncate")}>
            {formatLotVolume(lot)}
          </span>
          <span
            className={cn(
              "tabular-nums",
              shop ? "text-white/80" : "shrink-0 text-right text-ink",
            )}
          >
            {formatLotPrices(lot)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ProductFromPrice({
  product,
  className,
  unitClassName,
}: {
  product: Product;
  className?: string;
  unitClassName?: string;
}) {
  const from = catalogPrice(product);
  return (
    <p className={className}>
      {hasLots(product) ? "от " : ""}
      {formatPrice(from)}
      <span className={unitClassName}> / {product.unit}</span>
    </p>
  );
}
