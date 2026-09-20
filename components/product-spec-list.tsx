import { productSpecRows } from "@/lib/product-options";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductSpecList({
  product,
  variant = "card",
}: {
  product: Product;
  variant?: "card" | "shop" | "hover";
}) {
  const shop = variant === "shop";
  const hover = variant === "hover";
  const rows = productSpecRows(product, { fixed: hover });

  return (
    <dl
      className={cn(
        hover
          ? "flex h-full min-h-0 w-full min-w-0 flex-col py-1"
          : shop
            ? "mt-2 grid gap-1 text-[11px] leading-snug text-white/55"
            : "mt-2 grid gap-1 text-xs leading-snug text-steel",
      )}
    >
      {rows.map(({ label, value }, i) =>
        hover ? (
          <div
            key={label}
            className={cn(
              "flex min-h-10 min-w-0 w-full flex-1 px-4 text-[12px]",
              i === rows.length - 1 ? "" : "border-b border-border",
              label === "Покрытие" || label === "Вид покрытия"
                ? "flex-col justify-center gap-0.5 py-1"
                : "items-center justify-between gap-3",
            )}
          >
            <dt className="shrink-0 text-steel">{label}</dt>
            <dd
              className={cn(
                "min-w-0 font-medium",
                label === "Покрытие" || label === "Вид покрытия"
                  ? "leading-snug"
                  : "truncate text-right",
              )}
            >
              {value}
            </dd>
          </div>
        ) : (
          <div key={label} className="flex justify-between gap-2">
            <dt className="shrink-0">{label}</dt>
            <dd
              className={cn(
                "min-w-0 truncate text-right",
                shop ? "text-white/80" : "text-ink",
              )}
            >
              {value}
            </dd>
          </div>
        ),
      )}
    </dl>
  );
}
