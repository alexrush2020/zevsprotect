"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Корзина не пуста, но все модели сняты с продажи (или каталог не загрузился) — оформлять нечего. */
export function NoOrderable({ onClear }: { onClear: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="font-heading text-4xl">Нет доступных позиций</h1>
      <p className="mt-3 text-steel">
        Модели из корзины сейчас недоступны для заказа. Удалите их и подберите замену в каталоге.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="outline" className="h-11" onClick={onClear}>
          Удалить недоступные
        </Button>
        <Button nativeButton={false} render={<Link href="/catalog" />} className="h-11">
          Перейти в каталог
        </Button>
      </div>
    </div>
  );
}
