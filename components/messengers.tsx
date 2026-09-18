import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function Messengers({
  className,
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const chip =
    tone === "light"
      ? "rounded-full border border-white/20 px-3 py-1 text-xs hover:bg-white/10"
      : "rounded-full border px-3 py-1 text-xs text-ink hover:bg-muted";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <a href={brand.whatsappHref} className={chip} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
      <a href={brand.telegramHref} className={chip} target="_blank" rel="noreferrer">
        Telegram
      </a>
    </div>
  );
}

export function FloatingMessengers() {
  return (
    <div
      data-print-hide
      className="fixed bottom-24 right-4 z-40 flex flex-col gap-2 sm:bottom-6"
    >
      <a
        href={brand.whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="flex h-11 items-center justify-center rounded-full bg-[#25D366] px-4 text-sm font-medium text-white shadow-lg"
      >
        WhatsApp
      </a>
      <a
        href={brand.telegramHref}
        target="_blank"
        rel="noreferrer"
        className="flex h-11 items-center justify-center rounded-full bg-[#2AABEE] px-4 text-sm font-medium text-white shadow-lg"
      >
        Telegram
      </a>
    </div>
  );
}
