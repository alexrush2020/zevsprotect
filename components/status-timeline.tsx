import { STATUS_FLOW, STATUS_LABEL } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export function StatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Заказ отменён
      </p>
    );
  }
  const current = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);
  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {STATUS_FLOW.map((step, i) => {
        const done = i <= current;
        return (
          <li
            key={step}
            className={`rounded-xl border px-3 py-2 text-xs ${done ? "border-navy bg-navy text-paper" : "text-steel"}`}
          >
            <span className="block font-medium">{i + 1}</span>
            {STATUS_LABEL[step]}
          </li>
        );
      })}
    </ol>
  );
}
