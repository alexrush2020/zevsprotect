"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

const nav = [
  { href: "/account", label: "Главная" },
  { href: "/account/profile", label: "Профиль" },
  { href: "/account/favorites", label: "Избранное" },
  { href: "/account/orders", label: "Заказы" },
  { href: "/account/notifications", label: "Уведомления" },
] as const;

export function AccountShell({
  user,
  logout,
  children,
}: {
  user: UserProfile;
  logout: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl">Личный кабинет</h1>
          <p className="mt-2 text-steel">
            {[user.company || user.name, user.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <nav className="flex flex-wrap justify-end gap-2">
          {nav.map((item) => {
            const active =
              item.href === "/account"
                ? pathname === "/account"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-9",
                  active &&
                    "border-navy bg-navy text-paper hover:bg-ink-2 hover:text-paper",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Button variant="outline" className="h-9" onClick={logout}>
            Выйти
          </Button>
        </nav>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
