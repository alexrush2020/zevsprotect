import { formatReviewDate } from "@/lib/data/product-reviews";

export function ReviewShipmentMeta({
  orderDate,
  shipped,
  shippedAt,
  compact,
}: {
  orderDate: string;
  shipped: boolean;
  shippedAt?: string;
  compact?: boolean;
}) {
  const shipText = shipped
    ? shippedAt
      ? `Отгружена ${formatReviewDate(shippedAt)}`
      : "Отгружена"
    : "Ещё не отгружена";

  if (compact) {
    return (
      <p className="text-xs leading-4 text-steel">
        Партия от {formatReviewDate(orderDate)} · {shipText}
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-steel">
      <p>
        <span>Партия: </span>
        {formatReviewDate(orderDate)}
      </p>
      <p>
        <span>Отгрузка: </span>
        <span className={shipped ? "font-medium text-orange" : undefined}>{shipText}</span>
      </p>
    </div>
  );
}
