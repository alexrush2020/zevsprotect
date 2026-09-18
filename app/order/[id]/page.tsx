"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusTimeline } from "@/components/status-timeline";
import { IntegrationLog } from "@/components/integration-log";
import { useStore } from "@/lib/store";
import { getProductById } from "@/lib/data/catalog";
import { formatDate, formatPrice, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/format";
import { splitVat } from "@/lib/vat";

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { orders } = useStore();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-heading text-3xl">Заказ не найден</h1>
        <p className="mt-2 text-steel">
          В прототипе заказы хранятся в этом браузере. Гость может найти заказ
          по номеру на странице отслеживания.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button nativeButton={false} render={<Link href="/track" />} variant="outline">
            Отследить заказ
          </Button>
          <Button nativeButton={false} render={<Link href="/account" />}>
            В кабинет
          </Button>
        </div>
      </div>
    );
  }

  const goods = order.total - (order.deliveryCost ?? 0);
  const vat = splitVat(order.total);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-navy">Заказ</p>
      <h1 className="mt-2 font-heading text-4xl">{order.id}</h1>
      <p className="mt-2 text-steel">
        {formatDate(order.createdAt)} · {STATUS_LABEL[order.status]} ·{" "}
        {PAYMENT_LABEL[order.paymentStatus]}
      </p>

      <div className="mt-6">
        <StatusTimeline status={order.status} />
      </div>

      <div className="mt-6 space-y-2 rounded-2xl border bg-card p-5 text-sm">
        {order.items.map((item) => {
          const p = getProductById(item.productId);
          if (!p) return null;
          return (
            <div key={`${item.productId}-${item.size}`} className="flex justify-between">
              <span>
                {p.name} · {item.size} × {item.qty}
              </span>
              <span>{formatPrice(p.price * item.qty)}</span>
            </div>
          );
        })}
        <div className="flex justify-between border-t pt-3">
          <span>Товары</span>
          <span>{formatPrice(goods)}</span>
        </div>
        <div className="flex justify-between">
          <span>Доставка · {order.carrierName || "не указана"}</span>
          <span>{formatPrice(order.deliveryCost ?? 0)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Итого</span>
          <span>{formatPrice(order.total)}</span>
        </div>
        <p className="text-xs text-steel">в т.ч. НДС 20% {formatPrice(vat.vat)}</p>
      </div>

      <div className="mt-4 rounded-2xl border p-5 text-sm text-steel">
        <p>
          Получатель: {order.profile.name}, {order.profile.company}
        </p>
        {order.profile.inn ? <p>ИНН {order.profile.inn}{order.profile.kpp ? ` · КПП ${order.profile.kpp}` : ""}</p> : null}
        <p>Доставка: {order.city ? `${order.city}, ` : ""}{order.profile.address}</p>
        <p>
          Оплата: {PAYMENT_LABEL[order.payment]} · {PAYMENT_LABEL[order.paymentStatus]}
        </p>
        {order.guest ? (
          <p className="mt-2">
            Гостевой заказ: в Битрикс24 создан лид, компания не заводится, пока
            нет регистрации. Сохраните номер {order.id} для отслеживания.
          </p>
        ) : (
          <p className="mt-2">Сделка создана в Битрикс24. Статус заказа ведёт CRM (мок).</p>
        )}
      </div>

      <div className="mt-4">
        <IntegrationLog order={order} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {order.payment === "invoice_auto" || order.paymentStatus === "invoiced" || order.paymentStatus === "paid" ? (
          <Button nativeButton={false} render={<Link href={`/invoice/${order.id}`} />}>
            Открыть счёт
          </Button>
        ) : null}
        {order.payment === "online" && order.paymentStatus !== "paid" ? (
          <Button nativeButton={false} render={<Link href={`/pay/${order.id}`} />}>
            Оплатить онлайн
          </Button>
        ) : null}
        <Button nativeButton={false} render={<Link href="/catalog" />} variant="outline">
          Продолжить покупки
        </Button>
        <Button nativeButton={false} render={<Link href={order.guest ? "/track" : "/account"} />} variant="outline">
          {order.guest ? "Отслеживание" : "Личный кабинет"}
        </Button>
      </div>
    </div>
  );
}
