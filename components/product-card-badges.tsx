import { Badge } from "@/components/ui/badge";
import { productPromoStub } from "@/lib/product-promo";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCardBadges({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const { label } = productPromoStub(product);

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-3 top-3 z-[1] flex flex-col items-start gap-1",
        className,
      )}
    >
      <Badge className="bg-ink/85 text-paper">{label}</Badge>
    </div>
  );
}
