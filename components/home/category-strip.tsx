"use client";

import Link from "next/link";
import type { CatalogCategory } from "@/lib/server/map";
import { MediaImage } from "@/components/media-image";

export function CategoryStrip({ categories }: { categories: CatalogCategory[] }) {
  return (
    <div className="cat-strip">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/catalog?category=${c.slug}`}
          className="cat-panel"
        >
          <MediaImage src={c.image} alt="" className="cat-panel-img" />
          <span className="cat-panel-shade" />
          <span className="cat-panel-title">{c.short}</span>
        </Link>
      ))}
    </div>
  );
}
