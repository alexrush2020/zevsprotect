"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IntegrationLog } from "@/components/integration-log";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { brand } from "@/lib/brand";

export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { orders, updateOrder } = useStore();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-heading text-3xl">Платёж не найден</h1>
        <Button nativeButton={false} render={<Link href="/track" />} className="mt-6">
          Найти заказ
        </Button>
      </div>
    );
  }

  if (order.payment !== "online") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-heading text-3xl">Этот заказ без онлайн-оплаты</h1>
        <Button nativeButton={false} render={<Link href={`/order/${order.id}`} />} className="mt-6">
          К заказу
        </Button>
      </div>
    );
  }

  const current = order;

  function succeed() {
    updateOrder(current.id, { paymentStatus: "paid" });
    router.push(`/pay/${current.id}/success`);
  }

  function fail() {
    updateOrder(current.id, { paymentStatus: "failed" });
    router.push(`/pay/${current.id}/fail`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-navy">ЮKassa · песочница</p>
      <h1 className="mt-2 font-heading text-3xl">Оплата заказа {order.id}</h1>
      <p className="mt-2 text-steel">
        Виджет платёжной формы. Реального списания нет — кнопки ниже имитируют
        возврат на successUrl / failUrl.
      </p>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <p className="text-sm text-steel">К оплате</p>
        <p className="font-heading text-3xl">{formatPrice(order.total)}</p>
        <p className="mt-1 text-xs text-steel">
          Получатель {brand.legal} · ИНН {brand.inn}
        </p>

        {order.paymentStatus === "paid" ? (
          <p className="mt-4 rounded-xl bg-navy/10 p-3 text-sm">Оплата уже прошла.</p>
        ) : order.paymentStatus === "failed" ? (
          <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            Предыдущая попытка отменена. Можно повторить.
          </p>
        ) : (
          <p className="mt-4 rounded-xl bg-muted p-3 text-sm text-steel">
            Статус: ожидание оплаты в виджете.
          </p>
        )}

        <div className="mt-5 space-y-2 rounded-xl border p-4 text-sm">
          <p className="font-medium">Банковская карта</p>
          <p className="text-steel">2202 20** **** 1234 · 12/28 · *** </p>
          <p className="font-medium">СБП</p>
          <p className="text-steel">QR и пуш в приложении банка — заглушка.</p>
        </div>

        {order.paymentStatus !== "paid" ? (
          <div className="mt-5 grid gap-2">
            <Button className="h-11" onClick={succeed}>
              Оплатить успешно
            </Button>
            <Button variant="outline" className="h-11" onClick={fail}>
              Отклонить платёж
            </Button>
          </div>
        ) : (
          <Button nativeButton={false} render={<Link href={`/pay/${order.id}/success`} />} className="mt-5 h-11 w-full">
            К подтверждению оплаты
          </Button>
        )}
      </div>

      <div className="mt-6">
        <IntegrationLog order={order} />
      </div>
    </div>
  );
}
