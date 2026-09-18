import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { categories } from "@/lib/data/catalog";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: Product }) {
  const category = categories.find((c) => c.slug === product.category);
  const material =
    product.coating !== "Без покрытия"
      ? `${product.base} · ${product.coating}`
      : product.base;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-orange/50 hover:shadow-md"
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className="absolute inset-0 size-full object-cover object-center transition duration-500 group-hover:scale-105"
        />
        <Badge className="absolute left-3 top-3 bg-ink/85 text-paper">
          {category?.short}
        </Badge>
      </div>
      <div className="flex min-h-[10.5rem] flex-1 flex-col p-4">
        <p className="h-4 truncate text-[11px] uppercase tracking-[0.16em] text-steel">
          {product.sku}
        </p>
        <h3 className="mt-2 line-clamp-2 min-h-[2.75rem] font-heading text-base font-medium leading-snug">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-1 min-h-5 text-sm text-steel">{material}</p>
        <div className="mt-auto grid h-8 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 pt-2">
          <p className="truncate text-lg font-semibold leading-none tabular-nums">
            {formatPrice(product.price)}
            <span className="ml-1 text-xs font-normal text-steel">
              / {product.unit}
            </span>
          </p>
          <p className="shrink-0 text-right text-xs leading-none text-steel">
            {product.stock > 0
              ? `в наличии · ${product.stock.toLocaleString("ru-RU")}`
              : "под заказ"}
          </p>
        </div>
      </div>
    </Link>
  );
}
