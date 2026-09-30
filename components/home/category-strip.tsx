"use client";

import Link from "next/link";
import type { CatalogCategory } from "@/lib/server/map";

export function CategoryStrip({ categories }: { categories: CatalogCategory[] }) {
  return (
    <div className="cat-strip">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/catalog?category=${c.slug}`}
          className="cat-panel"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.image} alt="" className="cat-panel-img" />
          <span className="cat-panel-shade" />
          <span className="cat-panel-title">{c.short}</span>
        </Link>
      ))}
    </div>
  );
}
