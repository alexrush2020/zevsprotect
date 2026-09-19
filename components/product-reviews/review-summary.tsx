import type { reviewStats } from "@/lib/data/product-reviews";

export function ReviewSummary({
  title = "Отзывы на этот товар",
  stats,
}: {
  title?: string;
  stats: ReturnType<typeof reviewStats>;
}) {
  const { average, count, distribution } = stats;
  const stars = [5, 4, 3, 2, 1] as const;

  return (
    <div className="space-y-4">
      {title ? <h2 className="font-heading text-2xl">{title}</h2> : null}
      <div className="flex items-center gap-2">
        <span className="text-4xl font-semibold leading-none">
          {count > 0 ? average.toFixed(1) : "—"}
        </span>
        <svg viewBox="0 0 12 12" className="h-6 w-6 text-orange" fill="currentColor" aria-hidden>
          <path d="M6 1l1.5 3.5H11L8.2 7l1.1 3.5L6 8.5 2.7 10.5 3.8 7 1 4.5h3.5z" />
        </svg>
      </div>
      <p className="text-sm text-steel">Средняя оценка (отзывов: {count})</p>
      <div className="space-y-2">
        {stars.map((star) => {
          const pct = count > 0 ? (distribution[star] / count) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs text-steel">Звёзд: {star}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-orange transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
