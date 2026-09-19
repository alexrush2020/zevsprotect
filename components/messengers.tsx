import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

const iconBtn =
  "inline-flex size-8 items-center justify-center rounded-full transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange";

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
