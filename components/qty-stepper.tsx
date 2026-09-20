"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatVolumeQty } from "@/lib/volume-quote";
import { productMinQty, productOrderStep, snapOrderQty } from "@/lib/order-qty";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QtyInput({
  product,
  qty,
  onQtyChange,
  allowZero = false,
  className,
}: {
  product: Product;
  qty: number;
  onQtyChange: (qty: number) => void;
  allowZero?: boolean;
  className?: string;
}) {
  const snapped = snapOrderQty(qty, product, { allowZero });
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onQtyChangeRef = useRef(onQtyChange);
  onQtyChangeRef.current = onQtyChange;

  function commit(raw: string) {
    const parsed = Number.parseInt(raw.replace(/\s/g, ""), 10);
    onQtyChangeRef.current(
      snapOrderQty(Number.isFinite(parsed) ? parsed : 0, product, { allowZero }),
    );
    setDraft(null);
    setFocused(false);
  }

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const handleBlur = () => commit(el.value);
    el.addEventListener("blur", handleBlur);
    return () => el.removeEventListener("blur", handleBlur);
  });

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      className={className}
      value={focused && draft !== null ? draft : snapped ? String(snapped) : ""}
      aria-label={`Количество, ${product.unit}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onFocus={() => setFocused(true)}
      onBlur={(e) => commit(e.currentTarget.value)}
      onChange={(e) => {
        const next = e.target.value.replace(/\s/g, "");
        if (next !== "" && !/^\d+$/.test(next)) return;
        setDraft(next);
        if (next === "") return;
        const parsed = Number.parseInt(next, 10);
        if (Number.isFinite(parsed)) onQtyChange(parsed);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        commit(e.currentTarget.value);
        e.currentTarget.blur();
      }}
    />
  );
}

export function QtyStepper({
  product,
  qty,
  onQtyChange,
  allowZero = false,
  compact = false,
}: {
  product: Product;
  qty: number;
  onQtyChange: (qty: number) => void;
  allowZero?: boolean;
  compact?: boolean;
}) {
  const step = productOrderStep(product);
  const min = productMinQty(product);
  const snapped = snapOrderQty(qty, product, { allowZero });

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={() => {
          const next = snapped - step;
          onQtyChange(allowZero && next < min ? 0 : snapOrderQty(next, product, { allowZero }));
        }}
      >
        −
      </Button>
      <QtyInput
        product={product}
        qty={qty}
        onQtyChange={onQtyChange}
        allowZero={allowZero}
        className={cn(
          "rounded-lg border bg-background text-center tabular-nums",
          compact ? "h-8 w-16 text-sm" : "h-8 w-20",
        )}
      />
      <Button
        type="button"
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={() => onQtyChange(snapOrderQty(snapped + step, product))}
      >
        +
      </Button>
      <span className={cn("text-steel", compact ? "text-sm" : "text-sm")}>
        {formatVolumeQty(snapped || min, product.unit)}
      </span>
    </div>
  );
}
