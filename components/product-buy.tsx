"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { useStore } from "@/lib/store";
import { snapPackQty } from "@/lib/qty";
import type { Product } from "@/lib/types";

export function ProductBuy({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const router = useRouter();
  const [size, setSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(product.packQty);
  const inStock = product.stock > 0;

  function add() {
    if (!inStock) return;
    addToCart(product.id, size, snapPackQty(qty, product.packQty) || product.packQty);
    toast.success("Добавлено в корзину");
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-steel">Размер</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.sizes.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${size === s ? "border-ink bg-ink text-paper" : "hover:border-orange"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {inStock ? (
        <>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-steel">
              Количество, {product.unit} (кратность {product.packQty})
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setQty(Math.max(product.packQty, qty - product.packQty))}
              >
                −
              </Button>
              <input
                className="h-8 w-20 rounded-lg border bg-background text-center"
                type="number"
                min={product.packQty}
                step={product.packQty}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || product.packQty)}
                onBlur={(e) =>
                  setQty(snapPackQty(Number(e.target.value), product.packQty) || product.packQty)
                }
              />
              <Button variant="outline" onClick={() => setQty(qty + product.packQty)}>
                +
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="h-11 flex-1" onClick={add}>
              В корзину
            </Button>
            <Button
              variant="outline"
              className="h-11 flex-1"
              onClick={() => {
                add();
                router.push("/checkout");
              }}
            >
              Оформить заказ
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-navy/20 bg-navy/5 p-4 text-sm">
          <p className="font-medium">Нет в наличии</p>
          <p className="mt-1 text-steel">
            Остаток 0 из 1С. Запросите срок партии — менеджер ответит, когда
            цех сможет отгрузить.
          </p>
        </div>
      )}
      <InquiryDialog
        type="product"
        productName={product.name}
        trigger={
          <Button variant="ghost" className="w-full">
            {inStock ? "Запросить наличие или расчёт" : "Запросить срок партии"}
          </Button>
        }
      />
    </div>
  );
}
