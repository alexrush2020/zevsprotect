"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { Logo } from "@/components/logo";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { Messengers } from "@/components/messengers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { categories } from "@/lib/data/catalog";
import { formatPrice } from "@/lib/format";
import { brand } from "@/lib/brand";

const nav = [
  { href: "/about", label: "О компании" },
  { href: "/delivery", label: "Доставка" },
  { href: "/blog", label: "Статьи" },
  { href: "/contacts", label: "Контакты" },
];

const extra = [
  { href: "/samples", label: "Образцы" },
  { href: "/calculation", label: "Расчёт" },
  { href: "/price", label: "Прайс" },
  { href: "/track", label: "Отследить заказ" },
];

export function SiteHeader() {
  const { cartCount, cartTotal, user } = useStore();
  const [q, setQ] = useState("");
  const [mega, setMega] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-paper">
      <div className="border-b border-white/10 bg-ink-2">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-paper/60">
          <p>
            {brand.markRu} · {brand.tagline}
          </p>
          <div className="hidden items-center gap-4 sm:flex">
            <Link href="/price" className="hover:text-white">
              Прайс
            </Link>
            <Link href="/track" className="hover:text-white">
              Трекинг
            </Link>
            <a href={brand.phoneHref} className="hover:text-white">
              {brand.phone}
            </a>
            <a href={`mailto:${brand.email}`} className="hover:text-white">
              {brand.email}
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="text-paper hover:bg-white/10 lg:hidden"
              />
            }
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="left" className="bg-paper text-ink">
            <SheetHeader>
              <SheetTitle>Меню</SheetTitle>
            </SheetHeader>
            <div className="grid gap-1 px-4">
              <Link href="/catalog" className="rounded-lg px-2 py-2 text-sm hover:bg-muted">
                Каталог
              </Link>
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-2 py-2 text-sm hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
              {extra.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-2 py-2 text-sm hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
              <p className="mt-4 text-xs uppercase tracking-widest text-steel">
                Категории
              </p>
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/catalog?category=${c.slug}`}
                  className="rounded-lg px-2 py-2 text-sm hover:bg-muted"
                >
                  {c.short}
                </Link>
              ))}
              <Messengers className="mt-4" />
            </div>
          </SheetContent>
        </Sheet>

        <Link href="/" className="shrink-0">
          <Logo light />
        </Link>

        <nav className="hidden shrink-0 items-center gap-5 text-sm text-paper/80 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setMega(true)}
            onMouseLeave={() => setMega(false)}
          >
            <Link href="/catalog" className="whitespace-nowrap hover:text-white">
              Каталог
            </Link>
            {mega ? (
              <div className="absolute left-0 top-full z-50 w-[min(92vw,640px)] pt-3">
                <div className="rounded-2xl border bg-paper p-4 text-ink shadow-xl">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {categories.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/catalog?category=${c.slug}`}
                        className="rounded-xl p-2 hover:bg-muted"
                      >
                        <p className="font-heading text-sm">{c.short}</p>
                        <p className="text-xs text-steel">{c.name}</p>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 text-xs">
                    {extra.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="rounded-full border px-3 py-1 hover:bg-muted"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <form
          action="/catalog"
          className="ml-auto hidden min-w-[200px] flex-1 max-w-sm md:block"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-paper/40" />
            <Input
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по каталогу"
              className="h-9 border-white/15 bg-white/5 pl-8 text-paper placeholder:text-paper/40"
            />
          </div>
        </form>

        <Messengers className="shrink-0" />

        <InquiryDialog
          type="calc"
          trigger={
            <Button className="hidden h-9 bg-orange text-white hover:bg-orange-dk sm:inline-flex">
              Рассчитать поставку
            </Button>
          }
        />

        <Link
          href={user ? "/account" : "/login"}
          className="hidden items-center gap-1.5 text-xs text-paper/80 hover:text-white sm:flex"
        >
          <User className="size-4" />
          {user ? "Кабинет" : "Войти"}
        </Link>

        <Link href="/cart" className="relative flex items-center gap-2 text-paper">
          <ShoppingBag className="size-5" />
          <span className="hidden text-xs sm:block">
            {cartCount ? formatPrice(cartTotal) : "Корзина"}
          </span>
          {cartCount > 0 ? (
            <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-orange text-[10px] font-semibold text-white">
              {cartCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
