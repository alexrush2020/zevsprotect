"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusTimeline } from "@/components/status-timeline";
import { useStore } from "@/lib/store";
import { formatDate, formatPrice, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/format";
import { cartLineKey, cartLineOfferLabel } from "@/lib/lots";
import { repeatOrderItems } from "@/lib/cart-pricing";
import { myOrders } from "@/lib/server/order-action";
import { formatVolumeQty } from "@/lib/volume-quote";
import type { ViewOrder } from "@/lib/server/orders";
import type { Order } from "@/lib/types";

/** «1 позиция недоступна», «3 позиции недоступны», «5 позиций недоступно». */
function unavailableLabel(n: number) {
  const d = n % 10;
  const teen = n % 100 >= 11 && n % 100 <= 14;
  if (d === 1 && !teen) return `${n} позиция недоступна`;
  if (d >= 2 && d <= 4 && !teen) return `${n} позиции недоступны`;
  return `${n} позиций недоступно`;
}

/** Заказ Payload (строки — снапшот) или демо-заказ из localStorage. */
export function AccountOrderCard({ order }: { order: Order | ViewOrder }) {
  const { addToCart, clearCart, getProduct, catalog } = useStore();
  const router = useRouter();
  const server = "lines" in order;

  function repeat() {
    // позиции — по текущему каталогу; корзина и сервер при оформлении считают цену одним priceCart
    const { items, skipped } = repeatOrderItems(order.items, catalog);
    if (!items.length) {
      toast.error(`${unavailableLabel(skipped)}: модели сняты с продажи или цену уточнит менеджер.`);
      return;
    }
    clearCart();
    items.forEach((item) => addToCart(item.productId, item.size, item.qty, item.coating));
    toast.success(
      skipped
        ? `Состав заказа в корзине, ${unavailableLabel(skipped)}. Цены пересчитаны по текущему прайсу 1С.`
        : "Состав заказа в корзине. Цены пересчитаны по текущему прайсу 1С.",
    );
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
        {server
          ? order.lines.map((line) => (
              <li key={line.key}>
                {line.title} × {formatVolumeQty(line.qty, line.unit)}
              </li>
            ))
          : order.items.map((item) => {
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
        {/* онлайн-оплаты у реальных заказов пока нет (BIZ-4), /pay — мок для демо-заказов */}
        {!server && order.payment === "online" && order.paymentStatus !== "paid" ? (
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

/**
 * Заказы кабинета: у клиента с сессией Payload — из коллекции orders (демо-заказы localStorage не показываем),
 * у демо-входа прототипа — как раньше из localStorage. orders: null — загружаются или не загрузились;
 * notice — сообщение вместо списка (сбой загрузки с «Повторить», истёкшая сессия со ссылкой на вход).
 */
export function useAccountOrders(): { orders: (Order | ViewOrder)[] | null; notice: ReactNode } {
  const { user, orders } = useStore();
  const customer = user?.authProvider === "password" ? user.customerId : undefined;
  const [attempt, setAttempt] = useState(0);
  const [remote, setRemote] = useState<{
    key: string;
    state: { ok: true; orders: ViewOrder[] } | { ok: false; reason: "no-session" | "error" };
  } | null>(null);
  const key = `${customer}:${attempt}`;

  useEffect(() => {
    if (!customer) return;
    let live = true;
    myOrders()
      .then((state) => live && setRemote({ key, state }))
      .catch(() => live && setRemote({ key, state: { ok: false, reason: "error" } }));
    return () => {
      live = false;
    };
  }, [customer, key]);

  if (!user) return { orders: null, notice: null };
  if (!customer) return { orders: ordersForUser(orders, user.email), notice: null };
  const state = remote?.key === key ? remote.state : null;
  if (!state) return { orders: null, notice: null };
  if (state.ok) return { orders: state.orders, notice: null };
  return {
    orders: null,
    notice:
      state.reason === "no-session" ? (
        <div className="rounded-2xl border bg-card p-5 text-sm text-steel">
          <p>Сессия истекла — заказы не показаны.</p>
          <Button nativeButton={false} render={<Link href="/login" />} variant="outline" size="sm" className="mt-3">
            Войдите снова
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-5 text-sm text-steel" role="alert">
          <p>Не удалось загрузить заказы.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setAttempt((n) => n + 1)}>
            Повторить
          </Button>
        </div>
      ),
  };
}
