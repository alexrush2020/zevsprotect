"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusTimeline } from "@/components/status-timeline";
import { useStore } from "@/lib/store";
import { getProductById } from "@/lib/data/catalog";
import { formatDate, formatPrice, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/format";
import { cartLineKey, cartLineOfferLabel } from "@/lib/lots";

export default function AccountPage() {
  const { user, logout, orders, updateProfile, addToCart, clearCart } = useStore();
  const router = useRouter();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-heading text-3xl">Нужен вход</h1>
        <p className="mt-2 text-steel">История заказов и повтор покупки — в кабинете.</p>
        <Button nativeButton={false} render={<Link href="/login" />} className="mt-6">
          Войти
        </Button>
      </div>
    );
  }

  function repeat(orderId: string) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    clearCart();
    order.items.forEach((item) =>
      addToCart(
        item.productId,
        item.size,
        item.qty,
        item.lotId
          ? { lotId: item.lotId, packCount: item.packCount ?? 1 }
          : undefined,
      ),
    );
    toast.success("Состав заказа в корзине. Цены пересчитаны по текущему прайсу 1С.");
    router.push("/cart");
  }

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    updateProfile({
      email: String(data.get("email") || ""),
      name: String(data.get("name") || ""),
      phone: String(data.get("phone") || ""),
      company: String(data.get("company") || ""),
      inn: String(data.get("inn") || ""),
      kpp: String(data.get("kpp") || ""),
      address: String(data.get("address") || ""),
    });
    toast.success("Профиль обновлён");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl">Личный кабинет</h1>
          <p className="mt-2 text-steel">{user.company} · {user.email}</p>
        </div>
        <Button variant="outline" onClick={logout}>
          Выйти
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <form className="grid gap-3 rounded-2xl border bg-card p-5" onSubmit={save}>
          <h2 className="font-heading text-xl">Данные</h2>
          {[
            ["name", "Контакт"],
            ["company", "Организация"],
            ["inn", "ИНН"],
            ["kpp", "КПП"],
            ["phone", "Телефон"],
            ["email", "Email"],
            ["address", "Адрес доставки"],
          ].map(([id, label]) => (
            <div key={id} className="grid gap-1.5">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                name={id}
                defaultValue={user[id as keyof typeof user] ?? ""}
              />
            </div>
          ))}
          <Button type="submit">Сохранить</Button>
        </form>

        <div>
          <h2 className="font-heading text-xl">Заказы</h2>
          <p className="mt-1 text-sm text-steel">
            Статусы в прототипе заданы вручную. По ТЗ источник статуса — Битрикс24.
          </p>
          <div className="mt-4 space-y-3">
            {orders.filter((o) => !o.guest || o.profile.email === user.email).length === 0 ? (
              <p className="text-steel">Заказов пока нет.</p>
            ) : (
              orders
                .filter((o) => !o.guest || o.profile.email === user.email)
                .map((order) => (
                <div key={order.id} className="rounded-2xl border bg-card p-4">
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
                      const p = getProductById(item.productId);
                      return (
                        <li key={cartLineKey(item)}>
                          {p?.name} {p ? cartLineOfferLabel(p, item) : `× ${item.qty}`}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => repeat(order.id)}
                    >
                      Повторить заказ
                    </Button>
                    <Button nativeButton={false} render={<Link href={`/invoice/${order.id}`} />} variant="outline" size="sm">
                      Счёт
                    </Button>
                    {order.payment === "online" && order.paymentStatus !== "paid" ? (
                      <Button nativeButton={false} render={<Link href={`/pay/${order.id}`} />} variant="outline" size="sm">
                        Оплатить
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
