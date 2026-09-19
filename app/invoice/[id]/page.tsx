"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { getProductById } from "@/lib/data/catalog";
import { brand } from "@/lib/brand";
import { formatDate, formatPrice } from "@/lib/format";
import { cartLineKey, cartLineOfferLabel, cartLineTotal, getLot } from "@/lib/lots";
import { splitVat } from "@/lib/vat";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { orders } = useStore();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-heading text-3xl">Счёт не найден</h1>
        <p className="mt-2 text-steel">Нужен заказ из этого браузера.</p>
        <Button nativeButton={false} render={<Link href="/track" />} className="mt-6">
          Найти заказ
        </Button>
      </div>
    );
  }

  const goods = order.total - (order.deliveryCost ?? 0);
  const vat = splitVat(order.total);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap gap-3 print:hidden" data-print-hide>
        <Button onClick={() => window.print()}>Печать / PDF</Button>
        <Button nativeButton={false} render={<Link href={`/order/${order.id}`} />} variant="outline">
          К заказу
        </Button>
      </div>

      <article className="rounded-2xl border bg-white p-8 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-en-navy.png" alt={brand.mark} className="h-10 w-auto" />
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-steel">
              {brand.mark} · счёт на оплату
            </p>
          </div>
          <div className="text-right">
            <p className="font-heading text-2xl">Счёт {order.id}</p>
            <p className="text-steel">от {formatDate(order.createdAt)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-steel">Поставщик</p>
            <p className="mt-1 font-medium">{brand.legal}</p>
            <p>{brand.address}</p>
            <p>ИНН {brand.inn} · КПП {brand.kpp}</p>
            <p>ОГРН {brand.ogrn}</p>
            <p className="mt-2">р/с {brand.account}</p>
            <p>{brand.bank}</p>
            <p>к/с {brand.corr} · БИК {brand.bik}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-steel">Покупатель</p>
            <p className="mt-1 font-medium">{order.profile.company || order.profile.name}</p>
            <p>{order.profile.name}</p>
            {order.profile.inn ? <p>ИНН {order.profile.inn}</p> : null}
            {order.profile.kpp ? <p>КПП {order.profile.kpp}</p> : null}
            <p>{order.profile.address}</p>
            <p>{order.profile.email}</p>
            <p>{order.profile.phone}</p>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-left">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-2 py-2 font-medium">№</th>
              <th className="px-2 py-2 font-medium">Товар</th>
              <th className="px-2 py-2 font-medium">Арт.</th>
              <th className="px-2 py-2 font-medium">Кол-во</th>
              <th className="px-2 py-2 font-medium">Цена</th>
              <th className="px-2 py-2 font-medium">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => {
              const p = getProductById(item.productId);
              if (!p) return null;
              return (
                <tr key={cartLineKey(item)} className="border-b">
                  <td className="px-2 py-2">{index + 1}</td>
                  <td className="px-2 py-2">
                    {p.name} · {item.size}
                    {item.lotId ? ` · ${cartLineOfferLabel(p, item)}` : ""}
                  </td>
                  <td className="px-2 py-2">{p.sku}</td>
                  <td className="px-2 py-2">
                    {item.qty} {p.unit}
                    {getLot(p, item.lotId) ? ` · ${item.packCount ?? 0} уп.` : ""}
                  </td>
                  <td className="px-2 py-2">
                    {formatPrice(getLot(p, item.lotId)?.price ?? p.price)}
                  </td>
                  <td className="px-2 py-2">{formatPrice(cartLineTotal(p, item))}</td>
                </tr>
              );
            })}
            {order.deliveryCost ? (
              <tr className="border-b">
                <td className="px-2 py-2" colSpan={5}>
                  Доставка · {order.carrierName} · {order.city}
                </td>
                <td className="px-2 py-2">{formatPrice(order.deliveryCost)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="mt-6 ml-auto max-w-xs space-y-1">
          <p className="flex justify-between">
            <span>Товары</span>
            <span>{formatPrice(goods)}</span>
          </p>
          <p className="flex justify-between">
            <span>НДС 20%</span>
            <span>{formatPrice(vat.vat)}</span>
          </p>
          <p className="flex justify-between font-heading text-lg">
            <span>Итого</span>
            <span>{formatPrice(order.total)}</span>
          </p>
        </div>

        <p className="mt-8 text-xs text-steel">
          Цены включают НДС 20%. Документ сформирован на сайте {brand.domain}{" "}
          как макет PDF-счёта. В бою файл генерируется по запросу и уходит на{" "}
          {order.profile.email}.
        </p>
        {order.paymentStatus === "paid" ? (
          <p className="mt-6 inline-block rotate-[-8deg] rounded-full border-4 border-navy px-6 py-3 text-sm font-heading uppercase tracking-[0.2em] text-navy">
            Оплачено
          </p>
        ) : null}
      </article>
    </div>
  );
}
