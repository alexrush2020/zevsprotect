"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusTimeline } from "@/components/status-timeline";
import { trackOrder } from "@/lib/server/order-action";
import type { TrackView } from "@/lib/server/orders";
import { formatDate, formatPrice, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/format";
import { formatVolumeQty } from "@/lib/volume-quote";

export default function TrackPage() {
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [found, setFound] = useState<TrackView | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // ссылка «Отслеживание» со страницы заказа подставляет номер
    const number = new URLSearchParams(window.location.search).get("number");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- query читаем после гидратации
    if (number) setId(number);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFound(null);
    setBusy(true);
    const res = await trackOrder(id, email).catch(() => ({
      ok: false as const,
      error: "Не удалось проверить заказ. Проверьте связь и попробуйте ещё раз.",
    }));
    setBusy(false);
    if (res.ok) setFound(res.order);
    else setError(res.error);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-heading text-4xl">Отследить заказ</h1>
      <p className="mt-2 text-steel">
        Для гостевого заказа нужны номер и email из оформления.
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
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-11" disabled={busy}>
          {busy ? "Ищем…" : "Найти"}
        </Button>
      </form>

      {found ? (
        <div className="mt-8 rounded-2xl border bg-card p-4" aria-live="polite">
          <p className="font-heading">{found.number}</p>
          <p className="text-sm text-steel">
            {formatDate(found.createdAt)} · {STATUS_LABEL[found.status]} ·{" "}
            {PAYMENT_LABEL[found.paymentStatus]} · {formatPrice(found.total)}
          </p>
          <div className="mt-3">
            <StatusTimeline status={found.status} />
          </div>
          <ul className="mt-2 text-sm text-steel">
            {found.lines.map((line) => (
              <li key={line.key}>
                {line.title} · {line.size}
                {line.coating ? ` · ${line.coating}` : ""} × {formatVolumeQty(line.qty, line.unit)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
