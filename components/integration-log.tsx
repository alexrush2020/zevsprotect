import { mockIntegrations } from "@/lib/integrations";
import type { Order } from "@/lib/types";

export function IntegrationLog({ order }: { order: Order }) {
  const events = mockIntegrations(order);
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-steel">
        Обмен · моки 1С / Битрикс24 / ЮKassa
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {events.map((e, i) => (
          <li key={i} className="flex gap-3 border-b py-2 last:border-0">
            <span className="w-24 shrink-0 font-medium">{e.system}</span>
            <span className="w-14 shrink-0 text-xs uppercase text-steel">{e.status}</span>
            <span className="text-steel">{e.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
