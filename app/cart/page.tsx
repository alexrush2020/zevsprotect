"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { getProductById } from "@/lib/data/catalog";
import { formatPrice } from "@/lib/format";
import { cartLineCaption, cartLineKey, cartLineTotal, getLot } from "@/lib/lots";

export default function CartPage() {
  const { cart, setQty, removeFromCart, cartTotal } = useStore();

  if (!cart.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-heading text-4xl">Корзина пуста</h1>
        <p className="mt-3 text-steel">
          Добавьте модели из каталога или запросите подбор, если не знаете
          артикул.
        </p>
        <Button nativeButton={false} render={<Link href="/catalog" />} className="mt-6 h-11">
          Перейти в каталог
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-4xl">Корзина</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {cart.map((item) => {
            const p = getProductById(item.productId);
            if (!p) return null;
            const lot = getLot(p, item.lotId);
            const step = lot ? 1 : p.packQty;
            const value = lot ? (item.packCount ?? 0) : item.qty;
            return (
              <div
                key={cartLineKey(item)}
                className="flex gap-4 rounded-2xl border bg-card p-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt=""
                  className="size-24 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <Link href={`/product/${p.slug}`} className="font-heading">
                    {p.name}
                  </Link>
                  <p className="text-sm text-steel">{cartLineCaption(p, item)}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQty(item.productId, item.size, value - step, item.lotId)
                      }
                    >
                      −
                    </Button>
                    <input
                      className="h-8 w-16 rounded-lg border bg-background text-center text-sm"
                      type="number"
                      min={lot ? 0 : p.packQty}
                      step={step}
                      value={value}
                      onChange={(e) =>
                        setQty(
                          item.productId,
                          item.size,
                          Number(e.target.value),
                          item.lotId,
                        )
                      }
                      onBlur={(e) =>
                        setQty(
                          item.productId,
                          item.size,
                          Number(e.target.value),
                          item.lotId,
                        )
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQty(item.productId, item.size, value + step, item.lotId)
                      }
                    >
                      +
                    </Button>
                    <button
                      className="ml-3 text-xs text-steel underline"
                      onClick={() =>
                        removeFromCart(item.productId, item.size, item.lotId)
                      }
                    >
                      Удалить
                    </button>
                  </div>
                </div>
                <p className="font-medium">{formatPrice(cartLineTotal(p, item))}</p>
              </div>
            );
          })}
        </div>
        <aside className="h-fit rounded-2xl border bg-card p-5">
          <p className="text-sm text-steel">Итого к оплате</p>
          <p className="mt-1 font-heading text-3xl">{formatPrice(cartTotal)}</p>
          <p className="mt-2 text-xs text-steel">
            НДС 20% включён. Доставка считается на оформлении по мокам ТК.
          </p>
          <Button nativeButton={false} render={<Link href="/checkout" />} className="mt-5 h-11 w-full">
            Оформить заказ
          </Button>
          <Button nativeButton={false} render={<Link href="/delivery" />} variant="outline" className="mt-2 h-10 w-full">
            Сравнить доставку
          </Button>
        </aside>
      </div>
    </div>
  );
}
