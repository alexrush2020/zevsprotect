import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS = { hit: "Хит", new: "Новинка", sale: "Акция" } as const;

/** Метки из админки (Products.badges); без меток — ничего не показываем. */
export function ProductCardBadges({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  if (!product.badges?.length) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-3 top-3 z-[1] flex flex-col items-start gap-1",
        className,
      )}
    >
      {product.badges.map((b) => (
        <Badge key={b} className="bg-ink/85 text-paper">
          {LABELS[b]}
        </Badge>
      ))}
    </div>
  );
}
