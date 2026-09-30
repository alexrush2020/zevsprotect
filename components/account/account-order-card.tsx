"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusTimeline } from "@/components/status-timeline";
import { useStore } from "@/lib/store";
import { formatDate, formatPrice, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/format";
import { cartLineKey, cartLineOfferLabel } from "@/lib/lots";
import type { Order } from "@/lib/types";

export function AccountOrderCard({ order }: { order: Order }) {
  const { addToCart, clearCart, getProduct } = useStore();
  const router = useRouter();

  function repeat() {
    clearCart();
    order.items.forEach((item) =>
      addToCart(item.productId, item.size, item.qty, item.coating),
    );
    toast.success("Состав заказа в корзине. Цены пересчитаны по текущему прайсу 1С.");
    router.push("/cart");
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/order/${order.id}`} className="font-heading">
          {order.id}
        </Link>
        <span className="text-sm text-steel">{formatDate(order.createdAt)}</span>
      </div>
      <p className="mt-1 text-sm">
        {STATUS_LABEL[order.status]} · {PAYMENT_LABEL[order.paymentStatus]} ·{" "}
        {formatPrice(order.total)}
      </p>
      <p className="text-xs text-steel">
        {order.carrierName} · {order.city}
      </p>
      <div className="mt-3">
        <StatusTimeline status={order.status} />
      </div>
      <ul className="mt-2 text-sm text-steel">
        {order.items.map((item) => {
          const p = getProduct(item.productId);
          return (
            <li key={cartLineKey(item)}>
              {p?.name} {p ? cartLineOfferLabel(p, item) : `× ${item.qty}`}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={repeat}>
          Повторить заказ
        </Button>
        <Button
          nativeButton={false}
          render={<Link href={`/invoice/${order.id}`} />}
          variant="outline"
          size="sm"
        >
          Счёт
        </Button>
        {order.payment === "online" && order.paymentStatus !== "paid" ? (
          <Button
            nativeButton={false}
            render={<Link href={`/pay/${order.id}`} />}
            variant="outline"
            size="sm"
          >
            Оплатить
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ordersForUser(orders: Order[], email: string) {
  return orders.filter((o) => !o.guest || o.profile.email === email);
}
