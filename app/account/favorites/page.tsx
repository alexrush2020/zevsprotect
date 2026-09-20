"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AccountScroll } from "@/components/account/account-scroll";
import { ProductCardAddToCart } from "@/components/product-card-add-to-cart";
import { ProductVolumePrice } from "@/components/product-volume-price";
import { useStore } from "@/lib/store";
import { getProductById } from "@/lib/data/catalog";
import { defaultVolumeQty } from "@/lib/volume-quote";

export default function AccountFavoritesPage() {
  const { favoriteIds, toggleFavorite } = useStore();
  const products = favoriteIds
    .map((id) => getProductById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div>
      <h2 className="font-heading text-xl">Избранное</h2>
      <p className="mt-1 text-sm text-steel">
        Модели, которые отметили сердцем в каталоге. Список хранится в этом браузере.
      </p>
      {products.length === 0 ? (
        <p className="mt-4 rounded-2xl border bg-card p-5 text-sm text-steel">
          Пока пусто.{" "}
          <Link href="/catalog" className="underline underline-offset-4 hover:text-ink">
            Откройте каталог
          </Link>{" "}
          и добавьте модели в избранное.
        </p>
      ) : (
        <AccountScroll className="mt-4">
          {products.map((p) => (
            <FavoriteRow key={p.id} product={p} onRemove={() => {
              toggleFavorite(p.id);
              toast.success("Удалено из избранного");
            }} />
          ))}
        </AccountScroll>
      )}
    </div>
  );
}

function FavoriteRow({
  product,
  onRemove,
}: {
  product: NonNullable<ReturnType<typeof getProductById>>;
  onRemove: () => void;
}) {
  const [qty, setQty] = useState(() => defaultVolumeQty(product));

  return (
    <div className="flex flex-wrap gap-4 rounded-2xl border bg-card p-4">
      <Link href={`/product/${product.slug}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt="" className="size-full object-cover" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-[0.16em] text-steel">{product.sku}</p>
        <Link href={`/product/${product.slug}`} className="font-heading text-lg hover:text-orange">
          {product.name}
        </Link>
        <div className="mt-2 max-w-md">
          <ProductVolumePrice product={product} qty={qty} onQtyChange={setQty} />
        </div>
        <div className="mt-3 grid max-w-xs gap-2">
          <ProductCardAddToCart product={product} qty={qty} />
          <Button variant="outline" size="sm" onClick={onRemove}>
            Убрать
          </Button>
        </div>
      </div>
    </div>
  );
}
