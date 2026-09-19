"use client";

import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";
import { Heart, Package, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import { catalogPrice, formatPairs, formatLotVolume, hasLots } from "@/lib/lots";
import { snapPackQty } from "@/lib/qty";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ProductLotsPicker,
  emptyLotCounts,
  lotPicksFromCounts,
} from "@/components/product-lots-picker";

type ActionTone = "like" | "buy" | "reviews" | "samples";

export function ProductCardHoverActions({
  product,
  variant = "desktop",
}: {
  product: Product;
  variant?: "desktop" | "shop";
}) {
  const { toggleFavorite, isFavorite, addToCart, addLead, user } = useStore();
  const liked = isFavorite(product.id);
  const [quickOpen, setQuickOpen] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const showTip = variant === "desktop";
  const shop = variant === "shop";

  function onFavorite(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleFavorite(product.id);
    toast.success(added ? "Добавлено в избранное" : "Удалено из избранного");
  }

  return (
    <>
      <div
        className={cn(
          "product-card-actions-wrap",
          shop && "product-card-actions-wrap--shop",
        )}
      >
        <div
          className={cn(
            "product-card-actions-rail",
            shop && "product-card-actions-rail--shop",
          )}
        >
          <HoverActionButton
            tone="like"
            label={liked ? "В избранном" : "Избранное"}
            liked={liked}
            shop={shop}
            showTip={showTip}
            onClick={onFavorite}
          >
            <Heart
              className="size-[17px]"
              fill={liked ? "currentColor" : "none"}
              strokeWidth={1.7}
            />
          </HoverActionButton>
          <HoverActionButton
            tone="buy"
            label="Быстрый заказ"
            shop={shop}
            showTip={showTip}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickOpen(true);
            }}
          >
            <Zap className="size-[17px]" fill="currentColor" strokeWidth={0} />
          </HoverActionButton>
          <HoverActionButton
            tone="reviews"
            label="Отзывы"
            href={`/product/${product.slug}#reviews`}
            shop={shop}
            showTip={showTip}
          >
            <Star className="size-[17px]" strokeWidth={1.7} />
          </HoverActionButton>
          <HoverActionButton
            tone="samples"
            label="Заказать образцы"
            shop={shop}
            showTip={showTip}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSamplesOpen(true);
            }}
          >
            <Package className="size-[17px]" strokeWidth={1.7} />
          </HoverActionButton>
        </div>
      </div>

      <QuickOrderModal
        product={product}
        open={quickOpen}
        onOpenChange={setQuickOpen}
        addToCart={addToCart}
        addLead={addLead}
        defaultPhone={user?.phone ?? ""}
      />
      <InquiryDialog
        type="samples"
        productName={product.name}
        open={samplesOpen}
        onOpenChange={setSamplesOpen}
      />
    </>
  );
}

function HoverActionButton({
  tone,
  label,
  children,
  onClick,
  href,
  liked,
  shop,
  showTip,
}: {
  tone: ActionTone;
  label: string;
  children: React.ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  href?: string;
  liked?: boolean;
  shop?: boolean;
  showTip?: boolean;
}) {
  const className = cn(
    "group/btn product-card-action-btn",
    `product-card-action-btn--${tone}`,
    liked && "is-liked",
    shop && "product-card-action-btn--shop",
  );
  const tip = showTip ? (
    <span role="tooltip" className="product-card-action-tip">
      {label}
    </span>
  ) : null;

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label} onClick={onClick}>
        {children}
        {tip}
      </Link>
    );
  }

  return (
    <button type="button" className={className} aria-label={label} onClick={onClick}>
      {children}
      {tip}
    </button>
  );
}

function QuickOrderModal({
  product,
  open,
  onOpenChange,
  addToCart,
  addLead,
  defaultPhone,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addToCart: (
    productId: string,
    size: string,
    qty: number,
    lot?: { lotId: string; packCount: number },
  ) => void;
  addLead: (type: string, payload: Record<string, string>) => { id: string };
  defaultPhone: string;
}) {
  const inStock = product.stock > 0;
  const [size, setSize] = useState(product.sizes[0] ?? "L");
  const [qty, setQty] = useState(product.packQty);
  const [lotCounts, setLotCounts] = useState(() => emptyLotCounts(product));
  const [phone, setPhone] = useState(defaultPhone);
  const [sentId, setSentId] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const lotsMode = hasLots(product);

  function reset() {
    setSize(product.sizes[0] ?? "L");
    setQty(product.packQty);
    setLotCounts(emptyLotCounts(product));
    setPhone(defaultPhone);
    setSentId(null);
    setJustAdded(false);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  function handleAddToCart() {
    if (!inStock) return;
    if (lotsMode) {
      const picks = lotPicksFromCounts(product, lotCounts);
      if (!picks.length) {
        toast.error("Укажите число упаковок хотя бы у одной партии");
        return;
      }
      for (const { lot, packCount } of picks) {
        addToCart(product.id, size, lot.pairs * packCount, {
          lotId: lot.id,
          packCount,
        });
      }
    } else {
      addToCart(product.id, size, snapPackQty(qty, product.packQty) || product.packQty);
    }
    setJustAdded(true);
    toast.success("Добавлено в корзину");
    window.setTimeout(() => handleOpenChange(false), 700);
  }

  function handleLead(e: React.FormEvent) {
    e.preventDefault();
    const picks = lotsMode ? lotPicksFromCounts(product, lotCounts) : [];
    const snapped = lotsMode
      ? picks.reduce((sum, row) => sum + row.lot.pairs * row.packCount, 0)
      : snapPackQty(qty, product.packQty) || product.packQty;
    if (lotsMode && !picks.length) {
      toast.error("Укажите число упаковок хотя бы у одной партии");
      return;
    }
    const lead = addLead("quick-order", {
      product: product.name,
      sku: product.sku,
      size,
      qty: String(snapped),
      lots: lotsMode
        ? picks.map((row) => `${row.lot.id}:${row.packCount}`).join(",")
        : "",
      phone,
    });
    setSentId(lead.id);
    toast.success(`Заявка ${lead.id} принята`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{inStock ? "Быстрый заказ" : "Под заказ"}</DialogTitle>
          <DialogDescription>
            {product.name} · {hasLots(product) ? "от " : ""}
            {formatPrice(catalogPrice(product))} / {product.unit}
          </DialogDescription>
        </DialogHeader>
        {sentId ? (
          <p className="rounded-xl border border-orange/20 bg-orange/5 p-4 text-sm">
            Заявка {sentId} принята. Менеджер подтвердит объём и срок отгрузки.
            В прототипе лид сохранён локально.
          </p>
        ) : (
          <form className="grid gap-3" onSubmit={handleLead}>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-steel">Размер</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      size === s
                        ? "border-navy bg-navy text-paper"
                        : "hover:border-orange"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {lotsMode ? (
              <ProductLotsPicker
                product={product}
                counts={lotCounts}
                onCountChange={(lotId, count) =>
                  setLotCounts((prev) => ({
                    ...prev,
                    [lotId]: Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0,
                  }))
                }
              />
            ) : (
            <div className="grid gap-1.5">
              <Label htmlFor={`qty-${product.id}`}>
                Количество, {product.unit} (кратность {product.packQty})
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setQty(Math.max(product.packQty, qty - product.packQty))
                  }
                >
                  −
                </Button>
                <Input
                  id={`qty-${product.id}`}
                  type="number"
                  min={product.packQty}
                  step={product.packQty}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value) || product.packQty)}
                  onBlur={(e) =>
                    setQty(
                      snapPackQty(Number(e.target.value), product.packQty) ||
                        product.packQty,
                    )
                  }
                  className="h-8 w-24 text-center tabular-nums"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQty(qty + product.packQty)}
                >
                  +
                </Button>
              </div>
            </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor={`phone-${product.id}`}>Телефон</Label>
              <Input
                id={`phone-${product.id}`}
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7"
              />
            </div>
            <Button type="submit" className="h-10">
              Отправить заявку
            </Button>
            {inStock ? (
              <Button type="button" variant="outline" className="h-10" onClick={handleAddToCart}>
                {justAdded ? "Добавлено" : "Добавить в корзину"}
              </Button>
            ) : (
              <p className="text-xs text-steel">
                Нет на складе — заявка уйдёт менеджеру на срок партии.
              </p>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatPack(qty: number, unit: string) {
  if (unit !== "пара") return `${qty} ${unit}`;
  return formatPairs(qty);
}

export const PRODUCT_COLOR_SWATCH: Record<string, string> = {
  Белый: "#ffffff",
  Серый: "#9ca3af",
  Черный: "#171717",
  Оранжевый: "#f97316",
  Синий: "#2563eb",
  Красный: "#dc2626",
  Желтый: "#eab308",
  Зеленый: "#16a34a",
  Хаки: "#b59b4a",
};

export function ProductHoverDetails({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const inStock = product.stock > 0;
  const swatch = PRODUCT_COLOR_SWATCH[product.color];
  const rows: [string, ReactNode][] = [
    ["Размеры", product.sizes.join(", ")],
    ["Основа", product.base],
    ["Покрытие", product.coating],
    [
      "Цвет",
      <span key="color" className="inline-flex items-center justify-end gap-1.5">
        {swatch ? (
          <span
            className="h-4 w-4 rounded-full border border-black/15 shadow-inner"
            style={{ backgroundColor: swatch }}
            aria-hidden
          />
        ) : null}
        {product.color}
      </span>,
    ],
    ["Фасовка", hasLots(product)
      ? product.lots.map((lot) => formatLotVolume(lot)).join(" · ")
      : formatPack(product.packQty, product.unit)],
    ["Наличие", inStock ? `в наличии · ${product.stock.toLocaleString("ru-RU")}` : "под заказ"],
  ];

  if (compact) {
    return (
      <dl className="mt-2 grid gap-1 text-[11px] leading-snug text-white/55">
        {rows.slice(0, 4).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="shrink-0">{label}</dt>
            <dd className="min-w-0 truncate text-right text-white/80">{value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div className="product-card-hover-details" aria-hidden>
      <div className="product-card-hover-details__clip">
        <div className="product-card-hover-details__panel">
          {rows.map(([label, value], i) => (
            <div
              key={label}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 text-[12px] ${
                i === rows.length - 1 ? "" : "border-b border-border"
              }`}
            >
              <span className="shrink-0 text-steel">{label}</span>
              <div className="min-w-0 text-right font-medium">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
