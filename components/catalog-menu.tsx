"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { categories, products } from "@/lib/data/catalog";
import { cn } from "@/lib/utils";

type ExtraLink = { href: string; label: string };

type MenuChild = { href: string; label: string };

type MenuItem = {
  id: string;
  href: string;
  label: string;
  children: MenuChild[];
};

function productMenuLabel(name: string) {
  return name.replace(/^(Перчатки|Краги|Рукавицы)\s+/u, "");
}

export function CatalogMenu({ extra }: { extra: ExtraLink[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [panel, setPanel] = useState<MenuItem | null>(null);

  const items = useMemo<MenuItem[]>(
    () => [
      { id: "all", href: "/catalog", label: "Весь каталог", children: [] },
      ...categories.map((category) => ({
        id: category.slug,
        href: `/catalog?category=${category.slug}`,
        label: category.short,
        children: products
          .filter((product) => product.category === category.slug)
          .map((product) => ({
            href: `/product/${product.slug}`,
            label: productMenuLabel(product.name),
          })),
      })),
    ],
    [],
  );

  const hovered = items.find((item) => item.id === hoveredId) ?? null;
  const subOpen = Boolean(hovered?.children.length);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setHoveredId(null);
      setPanel(null);
    }
  }, [open]);

  function hoverItem(item: MenuItem) {
    setHoveredId(item.id);
    if (item.children.length) setPanel(item);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 whitespace-nowrap hover:text-white",
          open && "text-white",
        )}
      >
        Каталог
        <ChevronDown
          className={cn(
            "size-3.5 opacity-70 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div
            className="catalog-mega-panel"
            data-sub={subOpen ? "open" : "closed"}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <div className="catalog-mega-cols">
              <div className="catalog-mega-main">
                <p className="catalog-mega-kicker">Категории</p>
                <ul>
                  {items.map((item) => (
                    <CategoryRow
                      key={item.id}
                      item={item}
                      active={hoveredId === item.id}
                      onEnter={() => hoverItem(item)}
                    />
                  ))}
                </ul>
              </div>
              <div className="catalog-mega-sub" aria-hidden={!subOpen}>
                <div className="catalog-mega-sub-inner">
                  {panel ? (
                    <>
                      <p className="catalog-mega-kicker">Модели</p>
                      <ul
                        key={panel.id}
                        className="catalog-mega-scroll catalog-mega-sub-list"
                      >
                        {panel.children.map((child) => (
                          <li key={child.href}>
                            <Link href={child.href} className="catalog-mega-sub-link">
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            {extra.length ? (
              <div className="catalog-mega-extra">
                {extra.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="catalog-mega-extra-link"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CategoryRow({
  item,
  active,
  onEnter,
}: {
  item: MenuItem;
  active: boolean;
  onEnter: () => void;
}) {
  const hasChildren = item.children.length > 0;

  return (
    <li onMouseEnter={onEnter}>
      <Link
        href={item.href}
        className={cn("catalog-mega-row", active && "is-active")}
      >
        <span className={cn("catalog-mega-dot", active && "is-on")} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {hasChildren ? (
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 opacity-40 transition-colors duration-150",
              active && "text-orange opacity-100",
            )}
          />
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
      </Link>
    </li>
  );
}
