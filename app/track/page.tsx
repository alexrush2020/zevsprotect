"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusTimeline } from "@/components/status-timeline";
import { useStore } from "@/lib/store";
import { formatDate, formatPrice, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/format";

export default function TrackPage() {
  const { orders } = useStore();
  const router = useRouter();
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const recentGuest = orders.filter((o) => o.guest).slice(0, 3);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const needle = id.trim().toUpperCase();
    const mail = email.trim().toLowerCase();
    const found = orders.find(
      (o) => o.id.toUpperCase() === needle && o.profile.email.toLowerCase() === mail
    );
    if (!found) {
      setError("Заказ с таким номером и email в этом браузере не найден.");
      return;
    }
    router.push(`/order/${found.id}`);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-heading text-4xl">Отследить заказ</h1>
      <p className="mt-2 text-steel">
        Для гостевого заказа нужны номер и email из оформления. В прототипе
        данные только в этом браузере.
      </p>
      <p className="mt-2 text-sm text-steel">
        Демо: <code>ZP-10990</code> · <code>gost@example.ru</code>
      </p>
      <form className="mt-8 grid gap-3" onSubmit={onSubmit}>
        <div className="grid gap-1.5">
          <Label htmlFor="id">Номер заказа</Label>
          <Input
            id="id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="ZP-XXXXXX"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email из заказа</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="work@company.ru"
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-11">
          Найти
        </Button>
      </form>

      {recentGuest.length ? (
        <div className="mt-10">
          <p className="text-sm font-medium">Гостевые заказы в этом браузере</p>
          <ul className="mt-3 space-y-3">
            {recentGuest.map((order) => (
              <li key={order.id} className="rounded-2xl border bg-card p-4">
                <Link href={`/order/${order.id}`} className="font-heading">
                  {order.id}
                </Link>
                <p className="text-sm text-steel">
                  {formatDate(order.createdAt)} · {STATUS_LABEL[order.status]} ·{" "}
                  {PAYMENT_LABEL[order.paymentStatus]} · {formatPrice(order.total)}
                </p>
                <p className="text-xs text-steel">{order.profile.email}</p>
                <div className="mt-3">
                  <StatusTimeline status={order.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-8 text-sm text-steel">
          Нет гостевых заказов. Оформите заказ без регистрации — номер появится
          здесь.
        </p>
      )}
    </div>
  );
}
