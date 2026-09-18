import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 567"
      className={cn("fill-current", className)}
      aria-hidden
    >
      <path d="M168.521 327.441L164.528 327.077C113.601 322.451 88.1378 320.134 80.0491 302.714C71.9608 285.294 86.6234 264.347 115.949 222.454L235.374 51.8487C254.747 24.173 264.434 10.335 272.787 13.2777C281.14 16.22 280.017 33.074 277.77 66.7817L270.997 168.399C268.95 199.072 267.93 214.409 276.744 224.731C285.557 235.051 300.864 236.444 331.48 239.227L335.474 239.591C386.4 244.217 411.864 246.534 419.95 263.954C428.04 281.374 413.377 302.321 384.05 344.214L264.627 514.821C245.254 542.494 235.567 556.334 227.214 553.391C218.86 550.447 219.984 533.594 222.23 499.887L229.004 398.271C231.05 367.597 232.07 352.261 223.257 341.937C214.444 331.617 199.137 330.224 168.521 327.441Z" />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  light?: boolean;
  wide?: boolean;
  variant?: "en" | "ru";
};

export function Logo({
  className,
  light = false,
  wide = false,
  variant = "en",
}: LogoProps) {
  const src =
    variant === "ru"
      ? "/brand/logo-ru-navy.png"
      : wide
        ? light
          ? "/brand/logo-en-wide-white.png"
          : "/brand/logo-en-wide-navy.png"
        : light
          ? "/brand/logo-en-white.png"
          : "/brand/logo-en-navy.png";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={brand.markRu}
      className={cn(
        "w-auto",
        wide ? "h-10 sm:h-12" : "h-8",
        variant === "ru" && "h-16 sm:h-20",
        className
      )}
    />
  );
}
