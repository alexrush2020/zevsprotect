"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { cartWeightKg, quoteCarriers } from "@/lib/delivery";

export default function DeliveryPage() {
  const { cart, catalog } = useStore();
  const cartWeight = cartWeightKg(cart, catalog);

  const [city, setCity] = useState("Ростов-на-Дону");
  const [weight, setWeight] = useState(cartWeight ? String(cartWeight.toFixed(1)) : "12");
  const [run, setRun] = useState(false);

  const quotes = useMemo(
    () => quoteCarriers(city, Math.max(0.5, Number(weight) || 1)),
    [city, weight]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.22em] text-orange">Логистика</p>
      <h1 className="mt-2 font-heading text-4xl">Сравнить стоимость доставки</h1>
      <p className="mt-3 max-w-2xl text-steel">
        Мок калькуляторов СДЭК, Деловых линий, ПЭК и «Энергии» плюс самовывоз
        с площадки в Таганроге. Те же котировки подставляются на оформлении
        заказа.
      </p>

      <form
        className="mt-8 grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          setRun(true);
        }}
      >
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="city">Город доставки</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="weight">Вес, кг</Label>
          <Input
            id="weight"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <Button type="submit" className="sm:col-span-3 h-11">
          Сравнить ТК
        </Button>
      </form>

      {run ? (
        <div className="mt-6 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-ink text-left text-paper">
              <tr>
                <th className="px-4 py-3 font-medium">ТК</th>
                <th className="px-4 py-3 font-medium">Срок</th>
                <th className="px-4 py-3 font-medium">Ориентир</th>
                <th className="px-4 py-3 font-medium">Источник</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {quotes.map((q, i) => (
                <tr key={q.id} className="border-t">
                  <td className="px-4 py-3">
                    {q.name}
                    {i === 0 ? (
                      <span className="ml-2 rounded-full bg-orange/10 px-2 py-0.5 text-xs text-orange">
                        дешевле
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{q.eta}</td>
                  <td className="px-4 py-3 font-medium">
                    {q.price ? formatPrice(q.price) : "бесплатно"}
                  </td>
                  <td className="px-4 py-3 text-steel">{q.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm text-steel">
          Введите город и нажмите «Сравнить». Если в корзине есть товары, вес
          подставлен из карточек.
        </p>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["Виджеты ТК", "Три iframe на одной странице. Честно, но тяжёлый UX и три разных UI."],
          ["Сравнение в нашей таблице", "Как здесь: один запрос, сортировка, выбор ТК в заказе. В бою — живые API."],
          ["Агрегатор", "ApiShip / CDEK + ДЛ через одного подрядчика. Меньше интеграций, комиссия."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border p-5">
            <h2 className="font-heading">{t}</h2>
            <p className="mt-2 text-sm text-steel">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <InquiryDialog
          type="calc"
          trigger={<Button variant="outline">Не сравнивать — посчитать менеджеру</Button>}
        />
        <Button nativeButton={false} render={<Link href="/checkout" />} variant="outline">
          Перейти к оформлению
        </Button>
      </div>
    </div>
  );
}
