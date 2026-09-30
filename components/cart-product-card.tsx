"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { QtyStepper } from "@/components/qty-stepper";
import { Button } from "@/components/ui/button";
import { VolumeDiscountTracker } from "@/components/product-volume-price";
import { formatPrice } from "@/lib/format";
import { cartLineTotal, cartProductQty } from "@/lib/lots";
import { productMinQty } from "@/lib/order-qty";
import { productCoatingOptions } from "@/lib/product-options";
import { formatVolumeQty, quoteVolume, snapVolumeQty } from "@/lib/volume-quote";
import { useStore } from "@/lib/store";
import type { CartItem, Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MediaImage } from "@/components/media-image";

const cartChipClass = "rounded-md border px-2 py-1 text-xs leading-none";

function CartSelectedChip({ children }: { children: string }) {
  return (
    <span className={cn(cartChipClass, "border-ink bg-ink text-paper")}>
      {children}
    </span>
  );
}

function pickerChipClass(active: boolean) {
  return cn(
    cartChipClass,
    active ? "border-ink bg-ink text-paper" : "hover:border-orange",
  );
}

function CartPickerChips({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (!values.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((option) => {
        const active = option === value;
        if (values.length === 1) {
          return (
            <span key={option} className={pickerChipClass(true)}>
              {option}
            </span>
          );
        }
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            className={pickerChipClass(active)}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function CartAddVariantMenu({
  remaining,
  sizes,
  coatings,
  preferredSize,
  preferredCoating,
  onAdd,
}: {
  remaining: { size: string; coating?: string }[];
  sizes: string[];
  coatings: string[];
  preferredSize: string;
  preferredCoating: string;
  onAdd: (size: string, coating?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(preferredSize);
  const [coating, setCoating] = useState(preferredCoating);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasCoatings = coatings.length > 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!remaining.length) return null;

  const nextSize = sizes.includes(size) ? size : (sizes[0] ?? "");
  const nextCoating = hasCoatings
    ? coatings.includes(coating)
      ? coating
      : (preferredCoating && coatings.includes(preferredCoating)
          ? preferredCoating
          : coatings[0])
    : undefined;
  const canAdd = Boolean(
    nextSize &&
      remaining.some(
        (pair) =>
          pair.size === nextSize && (pair.coating ?? "") === (nextCoating ?? ""),
      ),
  );

  function syncFromPreferred() {
    setSize(sizes.includes(preferredSize) ? preferredSize : (sizes[0] ?? ""));
    setCoating(
      coatings.includes(preferredCoating)
        ? preferredCoating
        : (coatings[0] ?? ""),
    );
  }

  const tip = (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-30 -translate-x-1/2 whitespace-nowrap rounded-lg border border-orange/35 bg-navy px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-white opacity-0 shadow-[0_6px_16px_rgba(4,0,64,0.28)] transition-opacity group-hover/add:opacity-100 group-focus-visible/add:opacity-100",
        open && "!opacity-0",
      )}
    >
      Нажмите, чтобы добавить размер и покрытие
    </span>
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cn(
          cartChipClass,
          "group/add relative min-w-7 text-center hover:border-orange",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Нажмите, чтобы добавить размер и покрытие"
        onClick={() => {
          if (!open) syncFromPreferred();
          setOpen((prev) => !prev);
        }}
      >
        +
        {tip}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Добавить размер и покрытие"
          className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[12.5rem] rounded-lg bg-popover p-2.5 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-steel">
                Размер
              </p>
              <div className="mt-1.5">
                <CartPickerChips
                  values={sizes}
                  value={nextSize}
                  onChange={setSize}
                />
              </div>
            </div>
            {hasCoatings ? (
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-steel">
                  Покрытие
                </p>
                <div className="mt-1.5">
                  <CartPickerChips
                    values={coatings}
                    value={nextCoating ?? ""}
                    onChange={setCoating}
                  />
                </div>
              </div>
            ) : null}
            <Button
              type="button"
              size="xs"
              className="w-full"
              disabled={!canAdd}
              onClick={() => {
                if (!canAdd) return;
                onAdd(nextSize, nextCoating);
                setOpen(false);
              }}
            >
              Добавить
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CartProductCard({
  product,
  items,
}: {
  product: Product;
  items: CartItem[];
}) {
  const { setQty, removeProductFromCart } = useStore();
  const lines = useMemo(() => {
    const seen = new Set<string>();
    const list: CartItem[] = [];
    for (const item of items) {
      const key = `${item.size}::${item.coating ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(item);
    }
    return list;
  }, [items]);
  const [extraKeys, setExtraKeys] = useState<string[]>([]);
  const openLines = useMemo(() => {
    const seen = new Set<string>();
    const list: { size: string; coating?: string }[] = [];
    for (const item of [...lines, ...extraKeys.map((key) => {
      const [size, coating] = key.split("::");
      return { size, coating: coating || undefined };
    })]) {
      const key = `${item.size}::${item.coating ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ size: item.size, coating: item.coating });
    }
    return list;
  }, [lines, extraKeys]);
  const coatings = productCoatingOptions(product);
  const [pickSize, setPickSize] = useState(
    () => items[0]?.size ?? product.sizes[0] ?? "",
  );
  const [pickCoating, setPickCoating] = useState(
    () => items[0]?.coating ?? coatings[0] ?? product.coating,
  );
  const productQty = cartProductQty(items, product.slug);
  const quote = quoteVolume(product, productQty);
  const total = items.reduce(
    (sum, item) => sum + cartLineTotal(product, item, productQty),
    0,
  );

  function applyVolumeQty(nextQty: number) {
    const primary = openLines[0];
    if (!primary) return;
    const primaryQty = items
      .filter(
        (item) =>
          item.size === primary.size &&
          (item.coating ?? "") === (primary.coating ?? ""),
      )
      .reduce((sum, item) => sum + item.qty, 0);
    const others = productQty - primaryQty;
    setQty(
      product.slug,
      primary.size,
      Math.max(0, snapVolumeQty(product, nextQty) - others),
      primary.coating,
    );
  }

  function lineKey(size: string, coating?: string) {
    return `${size}::${coating ?? ""}`;
  }

  function hasLine(size: string, coating?: string) {
    return openLines.some(
      (line) => line.size === size && (line.coating ?? "") === (coating ?? ""),
    );
  }

  function addLine(size: string, coating?: string) {
    if (!size || hasLine(size, coating)) return;
    const key = lineKey(size, coating);
    setExtraKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setQty(product.slug, size, productMinQty(product), coating);
  }

  function lineCoating(line: { coating?: string }) {
    return line.coating || coatings[0] || "";
  }

  const displaySize = openLines[0]?.size ?? pickSize;
  const displayCoating = lineCoating(openLines[0] ?? { coating: pickCoating });
  const remainingPairs = product.sizes.flatMap((size) => {
    if (!size) return [];
    const coatingChoices = coatings.length ? coatings : [undefined];
    return coatingChoices
      .filter((coating) => coating !== "")
      .filter((coating) => !hasLine(size, coating))
      .map((coating) => ({ size, coating }));
  });
  const showSizeAdd = remainingPairs.some((pair) => pair.size !== displaySize);
  const showCoatingAdd = remainingPairs.some(
    (pair) => (pair.coating ?? "") !== displayCoating,
  );
  const showCoatingRow = Boolean(displayCoating || coatings.length);

  function renderAddMenu() {
    return (
      <CartAddVariantMenu
        remaining={remainingPairs}
        sizes={product.sizes.filter(Boolean)}
        coatings={coatings}
        preferredSize={displaySize}
        preferredCoating={displayCoating}
        onAdd={(size, coating) => {
          setPickSize(size);
          if (coating) setPickCoating(coating);
          addLine(size, coating);
        }}
      />
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex gap-4">
        <MediaImage
          src={product.image}
          alt=""
          className="size-24 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link href={`/product/${product.slug}`} className="font-heading">
                {product.name}
              </Link>
              <p className="text-sm text-steel">{product.sku}</p>
            </div>
            <p className="shrink-0 font-medium">{formatPrice(total)}</p>
          </div>
          <p className="mt-2 text-sm tabular-nums">
            {formatPrice(quote.unitPrice)} / {product.unit}
            {quote.discountPct > 0 ? (
              <span className="ml-2 text-orange">−{quote.discountPct}%</span>
            ) : null}
          </p>
          <div className="mt-2">
            {quote.next ? (
              <p className="text-xs text-steel">
                ещё {formatVolumeQty(quote.next.qty - productQty, product.unit)} до{" "}
                {quote.next.label}
              </p>
            ) : quote.discountPct > 0 ? (
              <p className="text-xs text-steel">{quote.label}</p>
            ) : (
              <p className="text-xs text-steel">
                Минимум {formatVolumeQty(productMinQty(product), product.unit)}
              </p>
            )}
            <VolumeDiscountTracker
              product={product}
              qty={productQty}
              onQtyChange={applyVolumeQty}
            />
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-steel">
                Размер
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {displaySize ? <CartSelectedChip>{displaySize}</CartSelectedChip> : null}
                {showSizeAdd ? renderAddMenu() : null}
              </div>
            </div>
            {showCoatingRow ? (
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-steel">
                  Покрытие
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {displayCoating ? (
                    <CartSelectedChip>{displayCoating}</CartSelectedChip>
                  ) : null}
                  {showCoatingAdd ? renderAddMenu() : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-4 space-y-4">
            {openLines.map((line) => {
              const lineItems = items.filter(
                (item) =>
                  item.size === line.size &&
                  (item.coating ?? "") === (line.coating ?? ""),
              );
              const linePairs = lineItems.reduce((sum, item) => sum + item.qty, 0);
              const many = openLines.length > 1;
              return (
                <div key={`${line.size}::${line.coating ?? ""}`} className="space-y-2">
                  {many ? (
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium">
                        Размер {line.size}
                        {line.coating ? ` · ${line.coating}` : ""}
                      </p>
                      <button
                        type="button"
                        className="text-xs text-steel underline"
                        onClick={() => {
                          setExtraKeys((prev) =>
                            prev.filter((key) => key !== `${line.size}::${line.coating ?? ""}`),
                          );
                          setQty(product.slug, line.size, 0, line.coating);
                        }}
                      >
                        Удалить размер
                      </button>
                    </div>
                  ) : null}
                  <QtyStepper
                    compact
                    allowZero
                    product={product}
                    qty={linePairs}
                    onQtyChange={(next) =>
                      setQty(product.slug, line.size, next, line.coating)
                    }
                  />
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="mt-4 text-xs text-steel underline"
            onClick={() => removeProductFromCart(product.slug)}
          >
            Удалить модель
          </button>
        </div>
      </div>
    </div>
  );
}
