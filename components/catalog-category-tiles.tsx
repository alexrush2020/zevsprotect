"use client";

import type { CatalogCategory } from "@/lib/server/map";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const tileClass: Record<string, string> = {
  mehanika: "col-span-2 min-h-[12.5rem]",
  zhar: "col-span-2 min-h-[12.5rem]",
  holod: "min-h-[11rem]",
  mbs: "min-h-[11rem]",
  himiya: "min-h-[11rem]",
  kragi: "min-h-[11rem]",
  rukavitsy: "col-span-2 min-h-[11rem]",
};

const tileOrder = [
  "mehanika",
  "zhar",
  "holod",
  "mbs",
  "himiya",
  "kragi",
  "rukavitsy",
] as const;

export function CatalogCategoryTiles({
  categories,
  products,
  active,
  onSelect,
}: {
  categories: CatalogCategory[];
  products: Product[];
  active: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {tileOrder.map((slug) => {
        const category = categories.find((c) => c.slug === slug);
        if (!category) return null;
        const count = products.filter((p) => p.category === slug).length;
        const selected = active === slug;
        return (
          <button
            key={slug}
            type="button"
            onClick={() => onSelect(slug)}
            className={cn(
              "relative overflow-hidden rounded-2xl text-left text-white",
              tileClass[slug],
              selected && "ring-2 ring-orange",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={category.image}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" />
            <div className="relative z-10 flex h-full flex-col justify-end p-4">
              <p className="font-heading text-2xl uppercase leading-none tracking-wide">
                {category.short}
              </p>
              <p className="mt-2 text-sm text-white/70">
                {count} {count === 1 ? "модель" : count < 5 ? "модели" : "моделей"}
              </p>
              <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange">
                Смотреть
                <span aria-hidden>→</span>
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
