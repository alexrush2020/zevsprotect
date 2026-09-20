"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
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
import { productMinQty, snapOrderQty } from "@/lib/order-qty";
import { defaultVolumeQty, quoteVolume } from "@/lib/volume-quote";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductVariantChips } from "@/components/product-card-add-to-cart";
import { ProductSpecList } from "@/components/product-spec-list";
import { ProductVolumePrice } from "@/components/product-volume-price";
import { QtyStepper } from "@/components/qty-stepper";
import { productCoatingOptions } from "@/lib/product-options";

type ActionTone = "like" | "buy" | "reviews" | "samples";

export function ProductCardHoverActions({
  product,
  variant = "desktop",
  volumeQty,
}: {
  product: Product;
  variant?: "desktop" | "shop";
  volumeQty?: number;
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
        volumeQty={volumeQty ?? defaultVolumeQty(product)}
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
  volumeQty,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addToCart: (productId: string, size: string, qty: number, coating?: string) => void;
  addLead: (type: string, payload: Record<string, string>) => { id: string };
  defaultPhone: string;
  volumeQty: number;
}) {
  const inStock = product.stock > 0;
  const coatings = productCoatingOptions(product);
  const [size, setSize] = useState(product.sizes[0] ?? "L");
  const [coating, setCoating] = useState(coatings[0] ?? product.coating);
  const [qty, setQty] = useState(volumeQty);
  const [phone, setPhone] = useState(defaultPhone);
  const [sentId, setSentId] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const min = productMinQty(product);

  useEffect(() => {
    if (!open) return;
    setQty(volumeQty);
  }, [open, volumeQty]);

  function reset() {
    setSize(product.sizes[0] ?? "L");
    setCoating(productCoatingOptions(product)[0] ?? product.coating);
    setQty(volumeQty);
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
    addToCart(product.id, size, snapOrderQty(qty, product), coating);
    setJustAdded(true);
    toast.success("Добавлено в корзину");
    window.setTimeout(() => handleOpenChange(false), 700);
  }

  function handleLead(e: React.FormEvent) {
    e.preventDefault();
    const snapped = snapOrderQty(qty, product);
    const lead = addLead("quick-order", {
      product: product.name,
      sku: product.sku,
      size,
      coating,
      qty: String(snapped),
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
            {product.name} · {formatPrice(quoteVolume(product, qty).unitPrice)} /{" "}
            {product.unit}
          </DialogDescription>
        </DialogHeader>
        {sentId ? (
          <p className="rounded-xl border border-orange/20 bg-orange/5 p-4 text-sm">
            Заявка {sentId} принята. Менеджер подтвердит объём и срок отгрузки.
            В прототипе лид сохранён локально.
          </p>
        ) : (
          <form className="grid gap-3" onSubmit={handleLead}>
            <ProductVolumePrice product={product} qty={qty} onQtyChange={setQty} />
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-steel">
                Размер и покрытие
              </p>
              <div className="mt-2">
                <ProductVariantChips
                  product={product}
                  size={size}
                  coating={coating}
                  onSizeChange={setSize}
                  onCoatingChange={setCoating}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`qty-${product.id}`}>
                Количество, {product.unit} · минимум {min}
              </Label>
              <QtyStepper product={product} qty={qty} onQtyChange={setQty} />
            </div>
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

export function ProductHoverDetails({
  product,
}: {
  product: Product;
}) {
  return (
    <div className="product-card-hover-details" aria-hidden>
      <div className="product-card-hover-details__clip">
        <div className="product-card-hover-details__panel">
          <ProductSpecList product={product} variant="hover" />
        </div>
      </div>
    </div>
  );
}
