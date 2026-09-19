"use client";

import Link from "next/link";
import { AskManagerButton } from "@/components/manager-chat/AskManagerButton";
import { ProductCardBadges } from "@/components/product-card-badges";
import { toManagerChatProduct } from "@/lib/manager-chat";
import type { Product } from "@/lib/types";
import {
  ProductFromPrice,
  ProductLotTeaser,
} from "@/components/product-lot-teaser";
import {
  ProductCardHoverActions,
  ProductHoverDetails,
} from "@/components/product-card-hover-actions";

export function ProductCard({ product }: { product: Product }) {
  const material =
    product.coating !== "Без покрытия"
      ? `${product.base} · ${product.coating}`
      : product.base;
  const href = `/product/${product.slug}`;

  return (
    <article className="product-card group/card relative z-0 flex w-full flex-col self-start hover:z-20">
      <div className="flex min-h-0 flex-col overflow-visible rounded-2xl border border-border bg-card shadow-sm transition-[border-radius,border-color,box-shadow] duration-300 group-hover/card:rounded-b-none group-hover/card:border-orange/50 group-hover/card:border-b-orange/20 group-hover/card:shadow-[0_8px_24px_rgba(4,0,64,0.12)] group-focus-within/card:rounded-b-none group-focus-within/card:border-orange/50">
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-t-2xl bg-muted">
          <Link href={href} className="block h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={product.name}
              className="absolute inset-0 size-full object-cover object-center transition duration-500 group-hover/card:scale-105"
            />
          </Link>
          <div className="pointer-events-none absolute inset-0">
            <ProductCardBadges product={product} />
            <div className="pointer-events-auto absolute right-2.5 top-2.5 z-10">
              <ProductCardHoverActions product={product} />
            </div>
          </div>
        </div>
        <div className="flex min-h-[10.5rem] flex-1 flex-col p-4 pb-2">
          <p className="h-4 truncate text-[11px] uppercase tracking-[0.16em] text-steel">
            {product.sku}
          </p>
          <h3 className="mt-2 line-clamp-2 min-h-[2.75rem] font-heading text-base font-medium leading-snug">
            <Link href={href} className="transition-colors hover:text-orange">
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-1 min-h-5 text-sm text-steel">{material}</p>
          <div className="mt-auto grid items-end gap-1 pt-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <ProductFromPrice
                product={product}
                className="truncate text-lg font-semibold leading-none tabular-nums"
                unitClassName="ml-1 text-xs font-normal text-steel"
              />
              <p className="shrink-0 text-right text-xs leading-none text-steel">
                {product.stock > 0
                  ? `в наличии · ${product.stock.toLocaleString("ru-RU")}`
                  : "под заказ"}
              </p>
            </div>
            <ProductLotTeaser product={product} />
          </div>
        </div>
        <div className="px-4 pb-4">
          <AskManagerButton product={toManagerChatProduct(product)} />
        </div>
      </div>
      <ProductHoverDetails product={product} />
    </article>
  );
}
