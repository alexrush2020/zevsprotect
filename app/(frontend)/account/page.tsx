"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AccountOrderCard, useAccountOrders } from "@/components/account/account-order-card";
import { useStore } from "@/lib/store";
import { track } from "@/lib/analytics";
import { formatDate, formatPrice, STATUS_LABEL } from "@/lib/format";
import { NOTICE_KIND_LABEL, readNotices, type AccountNotice } from "@/lib/account-notices";

export default function AccountHomePage() {
  const { user, favoriteIds, getProduct } = useStore();
  const { orders: loaded, notice } = useAccountOrders();
  const [notices, setNotices] = useState<AccountNotice[]>([]);

  useEffect(() => {
    // возврат из Яндекс ID (серверный редирект /account?login=yandex): цель входа и чистый адрес
    if (new URLSearchParams(window.location.search).get("login") !== "yandex") return;
    track("login_success", { method: "yandex" });
    window.history.replaceState(null, "", "/account");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- чтение localStorage после гидратации
    setNotices(readNotices().slice(0, 3));
  }, []);

  if (!user) return null;

  const mine = loaded ?? [];
  const inFlight = mine.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  );
  const delivered = mine.filter((o) => o.status === "delivered");
  const spent = mine.reduce((sum, o) => sum + o.total, 0);
  const favs = favoriteIds
    .map((id) => getProduct(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 3);

  const stats = [
    { label: "Заказов", value: String(mine.length) },
    { label: "В работе", value: String(inFlight.length) },
    { label: "Доставлено", value: String(delivered.length) },
    { label: "На сумму", value: formatPrice(spent) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-steel">{s.label}</p>
            <p className="mt-2 font-heading text-2xl text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button nativeButton={false} render={<Link href="/catalog" />} variant="outline">
          В каталог
        </Button>
        <Button nativeButton={false} render={<Link href="/price" />} variant="outline">
          Прайс-лист
        </Button>
        <Button nativeButton={false} render={<Link href="/samples" />} variant="outline">
          Заказать образцы
        </Button>
        <Button nativeButton={false} render={<Link href="/calculation" />}>
          Рассчитать поставку
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-heading text-xl">Последние заказы</h2>
            <Link href="/account/orders" className="text-sm text-steel underline-offset-4 hover:text-ink hover:underline">
              Все заказы
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {notice ?? (loaded === null ? null : mine.length === 0 ? (
              <p className="rounded-2xl border bg-card p-5 text-sm text-steel">
                Заказов пока нет. Оформите поставку из каталога.
              </p>
            ) : (
              mine.slice(0, 2).map((order) => (
                <AccountOrderCard key={order.id} order={order} />
              ))
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section>
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-heading text-xl">Уведомления</h2>
              <Link
                href="/account/notifications"
                className="text-sm text-steel underline-offset-4 hover:text-ink hover:underline"
              >
                Все
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {notices.length === 0 ? (
                <p className="text-sm text-steel">Новых уведомлений нет.</p>
              ) : null}
              {notices.map((n) => (
                <div key={n.id} className="rounded-2xl border bg-card p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-steel">
                    {NOTICE_KIND_LABEL[n.kind]} · {formatDate(n.date)}
                    {n.read ? "" : " · новое"}
                  </p>
                  <p className="mt-1 font-medium text-ink">{n.title}</p>
                  <p className="mt-1 text-sm text-steel">{n.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-heading text-xl">Избранное</h2>
            {favs.length === 0 ? (
              <p className="mt-2 text-sm text-steel">
                Пока пусто. В каталоге наведите на карточку и отметьте сердце.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {favs.map((p) => (
                  <li key={p.id}>
                    <Link href={`/product/${p.slug}`} className="hover:text-orange">
                      {p.name}
                    </Link>
                    <span className="text-steel"> · {p.sku}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button
              nativeButton={false}
              render={<Link href="/account/favorites" />}
              variant="outline"
              className="mt-4"
            >
              Открыть избранное
            </Button>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-heading text-xl">Документы</h2>
            <p className="mt-2 text-sm text-steel">
              Счёт печатается из заказа в один клик. Декларация лежит в карточке модели.
            </p>
            <p className="mt-2 text-sm text-ink">
              {inFlight[0]
                ? `Сейчас в работе: ${inFlight[0].id} · ${STATUS_LABEL[inFlight[0].status]}`
                : delivered[0]
                  ? `Последняя поставка: ${delivered[0].id}`
                  : "Когда появится заказ — здесь будет статус отгрузки."}
            </p>
            {mine[0] ? (
              <Button
                nativeButton={false}
                render={<Link href={`/invoice/${mine[0].id}`} />}
                variant="outline"
                className="mt-4"
              >
                Счёт {mine[0].id}
              </Button>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
