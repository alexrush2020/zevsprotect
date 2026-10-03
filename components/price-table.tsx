"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";

export function PriceTable() {
  const { catalog: products } = useStore();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();

  const rows = useMemo(() => {
    const sorted = products.slice().sort((a, b) => a.name.localeCompare(b.name, "ru"));
    if (!needle) return sorted;
    return sorted.filter((p) =>
      `${p.sku} ${p.name} ${p.base} ${p.coating} ${p.category}`
        .toLowerCase()
        .includes(needle)
    );
  }, [needle, products]);

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-3">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API-маршрут (CSV), не страница */}
          <Button nativeButton={false} render={<a href="/api/pricelist" />}>
            Скачать CSV
          </Button>
          <Button nativeButton={false} render={<Link href="/catalog" />} variant="outline">
            Открыть каталог
          </Button>
        </div>
        <div className="relative w-full sm:ml-auto sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-steel" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск: артикул, модель, основа"
            className="h-10 pl-8"
            aria-label="Поиск по прайсу"
          />
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="px-3 py-2 font-medium">Артикул</th>
              <th className="px-3 py-2 font-medium">Модель</th>
              <th className="px-3 py-2 font-medium">Основа</th>
              <th className="px-3 py-2 font-medium">Покрытие</th>
              <th className="px-3 py-2 font-medium">Цена</th>
              <th className="px-3 py-2 font-medium">Остаток</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.sku}</td>
                  <td className="px-3 py-2">
                    <Link href={`/product/${p.slug}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{p.base}</td>
                  <td className="px-3 py-2">{p.coating}</td>
                  <td className="px-3 py-2">{formatPrice(p.price)}</td>
                  <td className="px-3 py-2">{p.stock || "под заказ"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-steel">
                  Ничего не найдено по запросу «{q.trim()}». Сбросьте поиск или
                  проверьте артикул.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-steel">
        Показано {rows.length} из {products.length}
      </p>
    </>
  );
}
