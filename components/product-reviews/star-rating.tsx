import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = "sm",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  const cls = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5" aria-label={`Оценка ${value} из 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 12 12"
          className={cn(cls, i < Math.round(value) ? "text-orange" : "text-border")}
          fill="currentColor"
          aria-hidden
        >
          <path d="M6 1l1.5 3.5H11L8.2 7l1.1 3.5L6 8.5 2.7 10.5 3.8 7 1 4.5h3.5z" />
        </svg>
      ))}
    </div>
  );
}
