import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

const iconBtn =
  "inline-flex size-8 items-center justify-center rounded-full transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"
      />
    </svg>
  );
}

function MaxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="80 70 840 860" className={className} aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M508.211 878.328c-75.007 0-109.864-10.95-170.453-54.75-38.325 49.275-159.686 87.783-164.979 21.9 0-49.456-10.95-91.248-23.36-136.873-14.782-56.21-31.572-118.807-31.572-209.508 0-216.626 177.754-379.597 388.357-379.597 210.785 0 375.947 171.001 375.947 381.604.707 207.346-166.595 376.118-373.94 377.224m3.103-571.585c-102.564-5.292-182.499 65.7-200.201 177.024-14.6 92.162 11.315 204.398 33.397 210.238 10.585 2.555 37.23-18.98 53.837-35.587a189.8 189.8 0 0 0 92.71 33.032c106.273 5.112 197.08-75.794 204.215-181.95 4.154-106.382-77.67-196.486-183.958-202.574Z"
      />
    </svg>
  );
}

const links = [
  {
    href: brand.whatsappHref,
    label: "WhatsApp",
    Icon: WhatsAppIcon,
    className: "bg-[#25D366] text-white hover:bg-[#20bd5a]",
  },
  {
    href: brand.maxHref,
    label: "MAX",
    Icon: MaxIcon,
    className: "bg-[#471AFF] text-white hover:bg-[#3a14d6]",
  },
] as const;

export function Messengers({
  className,
  variant = "icons",
}: {
  className?: string;
  variant?: "icons" | "text";
}) {
  if (variant === "text") {
    const chip = "rounded-full border border-white/20 px-3 py-1 text-xs hover:bg-white/10";
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {links.map(({ href, label }) => (
          <a key={label} href={href} className={chip} target="_blank" rel="noreferrer">
            {label}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {links.map(({ href, label, Icon, className: itemClass }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className={cn(iconBtn, itemClass)}
        >
          <Icon className={label === "MAX" ? "size-5" : "size-4"} />
        </a>
      ))}
    </div>
  );
}
