"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AskManagerButton } from "@/components/manager-chat/AskManagerButton";
import { ProductVariantChips } from "@/components/product-card-add-to-cart";
import { ProductVolumePrice } from "@/components/product-volume-price";
import { QtyStepper } from "@/components/qty-stepper";
import { toManagerChatProduct } from "@/lib/manager-chat";
import { productMinQty, snapOrderQty } from "@/lib/order-qty";
import { productCoatingOptions } from "@/lib/product-options";
import { useStore } from "@/lib/store";
import { defaultVolumeQty, formatVolumeQty } from "@/lib/volume-quote";
import type { Product } from "@/lib/types";

export function ProductBuy({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const router = useRouter();
  const coatings = productCoatingOptions(product);
  const [size, setSize] = useState(product.sizes[0]);
  const [coating, setCoating] = useState(coatings[0] ?? product.coating);
  const [qty, setQty] = useState(() => defaultVolumeQty(product));
  const inStock = product.stock > 0;
  const min = productMinQty(product);

  function add() {
    if (!inStock) return false;
    addToCart(product.id, size, snapOrderQty(qty, product), coating);
    toast.success("Добавлено в корзину");
    return true;
  }

  return (
    <div className="space-y-4">
      <ProductVolumePrice product={product} qty={qty} onQtyChange={setQty} />
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-steel">
          Размер и покрытие
        </p>
        <div className="mt-2">
          <ProductVariantChips
            product={product}
            size={size}
            coating={coating}
            onSizeChange={setSize}
            onCoatingChange={setCoating}
          />
        </div>
      </div>
      {inStock ? (
        <>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-steel">
              Количество, {product.unit}
            </p>
            <p className="mt-1 text-xs text-steel">
              Минимум {formatVolumeQty(min, product.unit)}
            </p>
            <div className="mt-2">
              <QtyStepper product={product} qty={qty} onQtyChange={setQty} />
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
