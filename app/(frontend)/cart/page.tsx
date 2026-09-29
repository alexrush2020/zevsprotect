"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CartInquiryForm } from "@/components/cart-inquiry-form";
import { CartOrderForm } from "@/components/cart-order-form";
import { CartProductCard } from "@/components/cart-product-card";
import { useStore } from "@/lib/store";
import { getProductById } from "@/lib/data/catalog";
import { formatPrice } from "@/lib/format";
import { groupCartByProduct } from "@/lib/lots";
import { cn } from "@/lib/utils";

const ORDER_FORM_ID = "cart-order-form";

export default function CartPage() {
  const { cart, cartTotal } = useStore();
  const [tab, setTab] = useState<"order" | "request">("order");
  const groups = groupCartByProduct(cart);

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
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(280px,22rem)]">
        <div className="space-y-4">
          {groups.map(({ productId, items }) => {
            const product = getProductById(productId);
            if (!product) return null;
            return (
              <CartProductCard
                key={productId}
                product={product}
                items={items}
              />
            );
          })}
        </div>
        <div className="space-y-4">
          <aside className="h-fit rounded-2xl border bg-card p-5">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(
                [
                  ["order", "Заказ"],
                  ["request", "Заявка"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium",
                    tab === id ? "bg-ink text-paper" : "text-steel hover:text-ink",
                  )}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === "order" ? (
              <>
                <p className="mt-5 text-sm text-steel">Итого к оплате</p>
                <p className="mt-1 font-heading text-3xl">{formatPrice(cartTotal)}</p>
                <p className="mt-2 text-xs text-steel">
                  НДС 20% включён. Доставка считается на оформлении по мокам ТК.
                </p>
                <Button type="submit" form={ORDER_FORM_ID} className="mt-5 h-11 w-full">
                  Оформить заказ
                </Button>
              </>
            ) : (
              <div className="mt-5">
                <CartInquiryForm />
              </div>
            )}
            <Button nativeButton={false} render={<Link href="/delivery" />} variant="outline" className="mt-2 h-10 w-full">
              Сравнить доставку
            </Button>
          </aside>
          {tab === "order" ? <CartOrderForm formId={ORDER_FORM_ID} /> : null}
        </div>
      </div>
    </div>
  );
}
