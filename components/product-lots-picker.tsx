"use client";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import {
  formatLotVolume,
  formatPairs,
  lotVolumePrice,
} from "@/lib/lots";
import type { Product, ProductLot } from "@/lib/types";

export type LotPick = { lot: ProductLot; packCount: number };

export function emptyLotCounts(product: Product): Record<string, number> {
  return Object.fromEntries((product.lots ?? []).map((lot) => [lot.id, 0]));
}

export function lotPicksFromCounts(
  product: Product,
  counts: Record<string, number>,
): LotPick[] {
  return (product.lots ?? [])
    .map((lot) => ({ lot, packCount: counts[lot.id] ?? 0 }))
    .filter((row) => row.packCount > 0);
}

export function ProductLotsPicker({
  product,
  counts,
  onCountChange,
}: {
  product: Product;
  counts: Record<string, number>;
  onCountChange: (lotId: string, count: number) => void;
}) {
  const lots = product.lots ?? [];
  const picks = lotPicksFromCounts(product, counts);
  const selectedPairs = picks.reduce(
    (sum, row) => sum + row.lot.pairs * row.packCount,
    0,
  );
  const selectedTotal = picks.reduce(
    (sum, row) => sum + lotVolumePrice(row.lot) * row.packCount,
    0,
  );

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.16em] text-steel">Партии</p>
      <div className="space-y-2">
        {lots.map((lot) => {
          const count = counts[lot.id] ?? 0;
          return (
            <div key={lot.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{formatLotVolume(lot)}</p>
                  <p className="mt-0.5 text-xs text-steel">
                    {formatPrice(lotVolumePrice(lot))} за упаковку ·{" "}
                    {formatPrice(lot.price)}/пара
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onCountChange(lot.id, count - 1)}
                    disabled={count <= 0}
                  >
                    −
                  </Button>
                  <input
                    className="h-8 w-12 rounded-lg border bg-background text-center text-sm tabular-nums"
                    type="number"
                    min={0}
                    step={1}
                    value={count}
                    onChange={(e) => onCountChange(lot.id, Number(e.target.value))}
                    aria-label={`${formatLotVolume(lot)}, упаковок`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onCountChange(lot.id, count + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {selectedPairs > 0 ? (
        <p className="text-sm text-steel">
          В заказе {formatPairs(selectedPairs)} · {formatPrice(selectedTotal)}
        </p>
      ) : (
        <p className="text-sm text-steel">
          Укажите число упаковок у нужных партий — можно смешать несколько.
        </p>
      )}
    </div>
  );
}
