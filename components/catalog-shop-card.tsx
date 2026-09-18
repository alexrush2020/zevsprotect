"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { formatPrice } from "@/lib/format";
import { categories } from "@/lib/data/catalog";
import type { Product } from "@/lib/types";

export function CatalogShopCard({ product }: { product: Product }) {
  const category = categories.find((c) => c.slug === product.category);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12141c] p-2.5">
      <div className="relative aspect-[5/4] overflow-hidden rounded-xl bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt=""
          className="size-full object-cover object-center"
        />
        <p className="absolute inset-x-2 top-2 rounded-md bg-ink/90 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
          {category?.short}
        </p>
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange">
          {category?.short}
        </p>
        <h3 className="mt-1 line-clamp-3 min-h-[3.6rem] font-heading text-[15px] leading-snug text-white">
          {product.name}
        </h3>
        <p className="mt-1 text-xs text-white/45">Арт. {product.sku}</p>
        <p className="mt-2 text-sm tabular-nums text-white/80">
          {formatPrice(product.price)}
          <span className="ml-1 text-xs text-white/40">/ {product.unit}</span>
        </p>
        <div className="mt-auto grid gap-2 pt-3">
          <Button
            nativeButton={false}
            render={<Link href={`/product/${product.slug}`} />}
            variant="outline"
            className="h-9 w-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Подробнее
          </Button>
          <InquiryDialog
            type="product"
            productName={`${product.name} (${product.sku})`}
            trigger={
              <Button className="h-9 w-full bg-orange text-white hover:bg-orange-dk">
                Запросить
              </Button>
            }
          />
        </div>
      </div>
    </article>
  );
}
