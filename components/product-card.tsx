"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AskManagerButton } from "@/components/manager-chat/AskManagerButton";
import { ProductCardAddToCart } from "@/components/product-card-add-to-cart";
import { ProductCardBadges } from "@/components/product-card-badges";
import { ProductVolumePrice } from "@/components/product-volume-price";
import { toManagerChatProduct } from "@/lib/manager-chat";
import { defaultVolumeQty } from "@/lib/volume-quote";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ProductCardHoverActions,
  ProductHoverDetails,
} from "@/components/product-card-hover-actions";
import { MediaImage } from "@/components/media-image";

function updateHoverSide(el: HTMLElement | null) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--product-card-width", `${rect.width}px`);
  el.classList.toggle(
    "product-card--flip",
    window.innerWidth - rect.right < rect.width * 0.7 + 12,
  );
}

export function ProductCard({
  product,
  showShift = true,
}: {
  product: Product;
  showShift?: boolean;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const [qty, setQty] = useState(() => defaultVolumeQty(product));
  const material =
    product.coating !== "Без покрытия"
      ? `${product.base} · ${product.coating}`
      : product.base;
  const href = `/product/${product.slug}`;

  return (
    <article
      ref={rootRef}
      className="product-card group/card relative flex w-full flex-col self-start"
      onMouseEnter={() => updateHoverSide(rootRef.current)}
      onFocusCapture={() => updateHoverSide(rootRef.current)}
    >
      <div className="product-card__body flex min-h-0 flex-col overflow-visible rounded-2xl border border-border bg-card shadow-sm transition-[border-radius,border-color,box-shadow] duration-300">
        <div className="product-card__media relative aspect-square w-full shrink-0 overflow-hidden rounded-t-2xl bg-muted">
          <Link href={href} className="block h-full w-full">
            <MediaImage
              src={product.image}
              alt={product.name}
              className="absolute inset-0 size-full object-cover object-center transition duration-500 group-hover/card:scale-105"
            />
          </Link>
          <div className="pointer-events-none absolute inset-0">
            <ProductCardBadges product={product} />
            <div className="pointer-events-auto absolute right-2.5 top-2.5 z-10">
              <ProductCardHoverActions product={product} volumeQty={qty} />
            </div>
          </div>
        </div>
        <div
          className={cn(
            "flex flex-col p-4 pb-2",
            showShift ? "min-h-[13.5rem]" : "min-h-[12.25rem]",
          )}
        >
          <p className="h-4 truncate text-[11px] uppercase tracking-[0.16em] text-steel">
            {product.sku}
          </p>
          <h3 className="mt-2 line-clamp-2 min-h-[2.75rem] font-heading text-base font-medium leading-snug">
            <Link href={href} className="transition-colors hover:text-orange">
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-1 min-h-5 text-sm text-steel">{material}</p>
          <div className="mt-auto pt-2">
            <ProductVolumePrice
              product={product}
              qty={qty}
              onQtyChange={setQty}
              showShift={showShift}
            />
          </div>
        </div>
        <div className="grid min-h-[7.75rem] content-start gap-2 px-4 pb-4">
          <ProductCardAddToCart product={product} qty={qty} />
          <AskManagerButton
            product={toManagerChatProduct(product)}
            className="h-5 items-center"
          />
        </div>
      </div>
      <ProductHoverDetails product={product} />
    </article>
  );
}
