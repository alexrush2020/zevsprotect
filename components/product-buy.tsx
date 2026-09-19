"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AskManagerButton } from "@/components/manager-chat/AskManagerButton";
import {
  ProductLotsPicker,
  emptyLotCounts,
  lotPicksFromCounts,
} from "@/components/product-lots-picker";
import { toManagerChatProduct } from "@/lib/manager-chat";
import { useStore } from "@/lib/store";
import { snapPackQty } from "@/lib/qty";
import { hasLots } from "@/lib/lots";
import type { Product } from "@/lib/types";

export function ProductBuy({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const router = useRouter();
  const [size, setSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(product.packQty);
  const [lotCounts, setLotCounts] = useState(() => emptyLotCounts(product));
  const inStock = product.stock > 0;
  const lotsMode = hasLots(product);

  function setLotCount(lotId: string, count: number) {
    const value = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    setLotCounts((prev) => ({ ...prev, [lotId]: value }));
  }

  function add() {
    if (!inStock) return false;
    if (lotsMode) {
      const picks = lotPicksFromCounts(product, lotCounts);
      if (!picks.length) {
        toast.error("Укажите число упаковок хотя бы у одной партии");
        return false;
      }
      for (const { lot, packCount } of picks) {
        addToCart(product.id, size, lot.pairs * packCount, {
          lotId: lot.id,
          packCount,
        });
      }
      toast.success(
        picks.length > 1 ? "Партии добавлены в корзину" : "Добавлено в корзину",
      );
      return true;
    }
    addToCart(
      product.id,
      size,
      snapPackQty(qty, product.packQty) || product.packQty,
    );
    toast.success("Добавлено в корзину");
    return true;
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
          {lotsMode ? (
            <ProductLotsPicker
              product={product}
              counts={lotCounts}
              onCountChange={setLotCount}
            />
          ) : (
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
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="h-11 flex-1" onClick={add}>
              В корзину
            </Button>
            <Button
              variant="outline"
              className="h-11 flex-1"
              onClick={() => {
                if (add()) router.push("/checkout");
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
      <AskManagerButton
        product={toManagerChatProduct(product)}
        variant="detail"
        label={inStock ? "Уточнить наличие или расчёт" : "Уточнить срок партии"}
      />
    </div>
  );
}
