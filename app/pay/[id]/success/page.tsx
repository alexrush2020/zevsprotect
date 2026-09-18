"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IntegrationLog } from "@/components/integration-log";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";

export default function PaySuccessPage() {
  const { id } = useParams<{ id: string }>();
  const { orders } = useStore();
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

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-navy">ЮKassa · successUrl</p>
      <h1 className="mt-2 font-heading text-3xl">Оплата прошла</h1>
      <p className="mt-3 text-steel">
        Webhook <code>payment.succeeded</code> (мок). Заказ {order.id} отмечен
        как оплаченный. Сумма {formatPrice(order.total)}.
      </p>
      <div className="mt-8 flex flex-col gap-2">
        <Button nativeButton={false} render={<Link href={`/order/${order.id}`} />} className="h-11">
          К заказу
        </Button>
        <Button nativeButton={false} render={<Link href={`/invoice/${order.id}`} />} variant="outline" className="h-11">
          Открыть счёт
        </Button>
      </div>
      <div className="mt-8 text-left">
        <IntegrationLog order={order} />
      </div>
    </div>
  );
}
