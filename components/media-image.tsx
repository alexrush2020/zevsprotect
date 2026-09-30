import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

/**
 * Картинка из медиатеки с заглушкой: у товара/категории/статьи без фото image = "" (lib/server/map.ts),
 * а <img src=""> даёт предупреждение React и повторный запрос страницы (QA-D2).
 * Заглушка занимает тот же бокс (className img) — фон и знак бренда по центру.
 */
export function MediaImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src)
    return (
      <span
        {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })} // alt="" — декоративная, как и была
        className={cn(className, "block bg-muted text-steel/30")}
      >
        <span className="flex size-full items-center justify-center">
          <LogoMark className="h-1/3 max-h-16 w-auto" />
        </span>
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
