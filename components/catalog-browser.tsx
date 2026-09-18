"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { CatalogShopCard } from "@/components/catalog-shop-card";
import { CatalogCategoryTiles } from "@/components/catalog-category-tiles";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { categories, filterOptions, products } from "@/lib/data/catalog";
import type { CategorySlug } from "@/lib/types";

function CatalogFilters({
  category,
  setCat,
  base,
  setBase,
  coating,
  setCoating,
  color,
  setColor,
  size,
  setSize,
  inStockOnly,
  setInStockOnly,
  setPage,
  onReset,
}: {
  category: string;
  setCat: (next: string) => void;
  base: string[];
  setBase: Dispatch<SetStateAction<string[]>>;
  coating: string[];
  setCoating: Dispatch<SetStateAction<string[]>>;
  color: string[];
  setColor: Dispatch<SetStateAction<string[]>>;
  size: string[];
  setSize: Dispatch<SetStateAction<string[]>>;
  inStockOnly: boolean;
  setInStockOnly: Dispatch<SetStateAction<boolean>>;
  setPage: Dispatch<SetStateAction<number>>;
  onReset: () => void;
}) {
  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
    setPage(1);
  }

  return (
    <>
      <p className="text-xs uppercase tracking-[0.18em] text-steel">Категории</p>
      <div className="mt-3 grid gap-1">
        <button
          type="button"
          className={`rounded-lg px-2 py-1.5 text-left text-sm ${category === "all" ? "bg-orange text-white" : "hover:bg-muted"}`}
          onClick={() => setCat("all")}
        >
          Все товары
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={`rounded-lg px-2 py-1.5 text-left text-sm ${category === c.slug ? "bg-orange text-white" : "hover:bg-muted"}`}
            onClick={() => setCat(c.slug)}
          >
            {c.short}
          </button>
        ))}
      </div>
      {(
        [
          ["Основа", filterOptions.base, base, setBase],
          ["Покрытие", filterOptions.coating, coating, setCoating],
          ["Цвет", filterOptions.color, color, setColor],
          ["Размер", filterOptions.size, size, setSize],
        ] as const
      ).map(([title, options, selected, setter]) => (
        <div key={title} className="mt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-steel">{title}</p>
          <div className="mt-2 grid gap-1.5">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={() => toggle(selected, opt, setter)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}
      <label className="mt-5 flex items-center gap-2 text-sm">
        <Checkbox
          checked={inStockOnly}
          onCheckedChange={(v) => {
            setInStockOnly(Boolean(v));
            setPage(1);
          }}
        />
        Только в наличии
      </label>
      <Button
        variant="outline"
        className="mt-5 w-full"
        onClick={onReset}
      >
        Сбросить фильтры
      </Button>
    </>
  );
}

export function CatalogBrowser() {
  const params = useSearchParams();
  const router = useRouter();
  const initialCategory = params.get("category") || "all";
  const initialQ = params.get("q") || "";

  const [category, setCategory] = useState(initialCategory);
  const [q, setQ] = useState(initialQ);
  const [base, setBase] = useState<string[]>([]);
  const [coating, setCoating] = useState<string[]>([]);
  const [color, setColor] = useState<string[]>([]);
  const [size, setSize] = useState<string[]>([]);
  const [sort, setSort] = useState("popular");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (q && !`${p.name} ${p.sku} ${p.base} ${p.coating}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      if (base.length && !base.includes(p.base)) return false;
      if (coating.length && !coating.includes(p.coating)) return false;
      if (color.length && !color.includes(p.color)) return false;
      if (size.length && !p.sizes.some((s) => size.includes(s))) return false;
      if (inStockOnly && p.stock <= 0) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return list;
  }, [category, q, base, coating, color, size, sort, inStockOnly]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCategory = categories.find((c) => c.slug === category);

  function setCat(next: string) {
    setCategory(next);
    setPage(1);
    const sp = new URLSearchParams(params.toString());
    if (next === "all") sp.delete("category");
    else sp.set("category", next);
    router.replace(`/catalog${sp.toString() ? `?${sp}` : ""}`);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      document.getElementById("catalog-models")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function reset() {
    setBase([]);
    setCoating([]);
    setColor([]);
    setSize([]);
    setInStockOnly(false);
    setQ("");
    setCat("all");
  }

  const filterProps = {
    category,
    setCat,
    base,
    setBase,
    coating,
    setCoating,
    color,
    setColor,
    size,
    setSize,
    inStockOnly,
    setInStockOnly,
    setPage,
    onReset: reset,
  };

  const toolbar = (
    <>
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder="Поиск: артикул, название, покрытие"
        className="border-white/15 bg-white/5 text-white placeholder:text-white/40 lg:border-input lg:bg-background lg:text-foreground lg:placeholder:text-muted-foreground"
      />
      <Select value={sort} onValueChange={(v) => v && setSort(v)}>
        <SelectTrigger className="w-full border-white/15 bg-white/5 text-white sm:w-56 lg:border-input lg:bg-background lg:text-foreground">
          <SelectValue placeholder="Сортировка">
            {sort === "popular"
              ? "Сначала рекомендуемые"
              : sort === "price-asc"
                ? "Цена: по возрастанию"
                : sort === "price-desc"
                  ? "Цена: по убыванию"
                  : "По названию"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="popular">Сначала рекомендуемые</SelectItem>
          <SelectItem value="price-asc">Цена: по возрастанию</SelectItem>
          <SelectItem value="price-desc">Цена: по убыванию</SelectItem>
          <SelectItem value="name">По названию</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <>
      <div className="bg-ink text-paper lg:hidden">
        <div className="px-4 pb-6 pt-8">
          <p className="text-center text-xs uppercase tracking-[0.22em] text-orange">
            Каталог по видам защиты
          </p>
          <h1 className="mt-3 text-center font-heading text-[2rem] leading-none">
            Под каждое
            <span className="block text-orange">производство</span>
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-center text-sm text-white/60">
            Прямые поставки с завода в Таганроге. Выберите вид защиты и запросите
            партию.
          </p>
        </div>
        <CatalogCategoryTiles active={category} onSelect={setCat} />
        <div id="catalog-models" className="scroll-mt-24 px-4 pb-16 pt-10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-orange">
                {activeCategory?.short ?? "Все модели"}
              </p>
              <h2 className="mt-1 font-heading text-2xl">
                {activeCategory?.name ?? "Рабочие перчатки"}
              </h2>
            </div>
            {category !== "all" ? (
              <button
                type="button"
                className="shrink-0 text-xs uppercase tracking-[0.14em] text-white/50"
                onClick={() => setCat("all")}
              >
                Все виды
              </button>
            ) : null}
          </div>
          <div className="mt-5 grid gap-2">{toolbar}</div>
          <div className="mt-3">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  />
                }
              >
                <SlidersHorizontal className="size-4" />
                Фильтры
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto bg-paper text-ink">
                <SheetHeader>
                  <SheetTitle>Фильтры</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-8">
                  <CatalogFilters {...filterProps} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <p className="mt-4 text-sm text-white/50">
            Найдено {filtered.length} моделей. Цены и остатки — из 1С.
          </p>
          {slice.length ? (
            <div className="mt-5 grid auto-rows-fr grid-cols-2 items-stretch gap-3">
              {slice.map((p) => (
                <CatalogShopCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/50">
              Нет товаров по фильтрам. Сбросьте условия или запросите подбор.
            </div>
          )}
          {pages > 1 ? (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => (
                <Button
                  key={i}
                  variant={page === i + 1 ? "default" : "outline"}
                  className={
                    page === i + 1
                      ? ""
                      : "border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  }
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto hidden max-w-6xl gap-8 px-4 py-10 lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border bg-card p-4">
          <CatalogFilters {...filterProps} />
        </aside>
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Поиск: артикул, название, покрытие"
            />
            <Select value={sort} onValueChange={(v) => v && setSort(v)}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Сначала рекомендуемые</SelectItem>
                <SelectItem value="price-asc">Цена: по возрастанию</SelectItem>
                <SelectItem value="price-desc">Цена: по убыванию</SelectItem>
                <SelectItem value="name">По названию</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 text-sm text-steel">
            Найдено {filtered.length} моделей. Цены и остатки — из 1С.
          </p>
          {slice.length ? (
            <div className="mt-6 grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {slice.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed p-10 text-center text-steel">
              Нет товаров по фильтрам. Сбросьте условия или запросите подбор.
            </div>
          )}
          {pages > 1 ? (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => (
                <Button
                  key={i}
                  variant={page === i + 1 ? "default" : "outline"}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export type { CategorySlug };
