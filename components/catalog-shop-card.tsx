"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AskManagerButton } from "@/components/manager-chat/AskManagerButton";
import {
  ProductCardHoverActions,
} from "@/components/product-card-hover-actions";
import { ProductCardAddToCart } from "@/components/product-card-add-to-cart";
import { ProductCardBadges } from "@/components/product-card-badges";
import { ProductSpecList } from "@/components/product-spec-list";
import { ProductVolumePrice } from "@/components/product-volume-price";
import { toManagerChatProduct } from "@/lib/manager-chat";
import { categories } from "@/lib/data/catalog";
import { defaultVolumeQty } from "@/lib/volume-quote";
import type { Product } from "@/lib/types";
import { MediaImage } from "@/components/media-image";

export function CatalogShopCard({ product }: { product: Product }) {
  const [qty, setQty] = useState(() => defaultVolumeQty(product));
  const category = categories.find((c) => c.slug === product.category);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12141c] p-2.5">
      <div className="relative aspect-[5/4] overflow-hidden rounded-xl bg-white/5">
        <Link href={`/product/${product.slug}`} className="block size-full">
          <MediaImage
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
          <ProductCardHoverActions product={product} variant="shop" volumeQty={qty} />
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
        <div className="mt-2">
          <ProductVolumePrice
            product={product}
            qty={qty}
            onQtyChange={setQty}
            variant="shop"
            showShift={false}
          />
        </div>
        <ProductSpecList product={product} variant="shop" />
        <div className="mt-auto grid gap-2 pt-3">
          <ProductCardAddToCart product={product} qty={qty} shop />
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
