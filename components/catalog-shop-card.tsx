"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AskManagerButton } from "@/components/manager-chat/AskManagerButton";
import {
  ProductCardHoverActions,
  ProductHoverDetails,
} from "@/components/product-card-hover-actions";
import { ProductCardBadges } from "@/components/product-card-badges";
import {
  ProductFromPrice,
  ProductLotTeaser,
} from "@/components/product-lot-teaser";
import { toManagerChatProduct } from "@/lib/manager-chat";
import { categories } from "@/lib/data/catalog";
import type { Product } from "@/lib/types";

export function CatalogShopCard({ product }: { product: Product }) {
  const category = categories.find((c) => c.slug === product.category);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12141c] p-2.5">
      <div className="relative aspect-[5/4] overflow-hidden rounded-xl bg-white/5">
        <Link href={`/product/${product.slug}`} className="block size-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.name}
            className="size-full object-cover object-center"
          />
        </Link>
        <ProductCardBadges
          product={product}
          className="left-2 top-2 max-w-[calc(100%-3.25rem)]"
        />
        <div className="absolute right-1.5 top-1.5 z-10">
          <ProductCardHoverActions product={product} variant="shop" />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange">
          {category?.short}
        </p>
        <h3 className="mt-1 line-clamp-3 min-h-[3.6rem] font-heading text-[15px] leading-snug text-white">
          <Link href={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="mt-1 text-xs text-white/45">Арт. {product.sku}</p>
        <ProductFromPrice
          product={product}
          className="mt-2 text-sm tabular-nums text-white/80"
          unitClassName="ml-1 text-xs text-white/40"
        />
        <ProductLotTeaser product={product} variant="shop" />
        <ProductHoverDetails product={product} compact />
        <div className="mt-auto grid gap-2 pt-3">
          <Button
            nativeButton={false}
            render={<Link href={`/product/${product.slug}`} />}
            variant="outline"
            className="h-9 w-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Подробнее
          </Button>
          <AskManagerButton
            product={toManagerChatProduct(product)}
            variant="cta"
          />
        </div>
      </div>
    </article>
  );
}
