"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { CatalogShopCard } from "@/components/catalog-shop-card";
import { CatalogCategoryTiles } from "@/components/catalog-category-tiles";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  buildSpecFilters,
  productMatchesWeightFilters,
} from "@/lib/data/catalog";
import { catalogPrice } from "@/lib/lots";
import type { CatalogCategory } from "@/lib/server/map";
import type { CategorySlug, Product } from "@/lib/types";

const COLOR_SWATCH: Record<string, string> = {
  Белый: "#ffffff",
  Серый: "#9ca3af",
  Черный: "#171717",
  Оранжевый: "#f97316",
  Синий: "#2563eb",
  Красный: "#dc2626",
  Желтый: "#eab308",
  Зеленый: "#16a34a",
  Хаки: "#b59b4a",
  Узор: "#db2777",
};

const COLOR_SWATCH_CLASS =
  "border-black/45 shadow-none focus-visible:border-black/45 focus-visible:ring-0 dark:bg-[unset] data-checked:border-black/45 data-checked:bg-[unset] dark:data-checked:bg-[unset] [&_[data-slot=checkbox-indicator]]:hidden";

const SORT_OPTIONS = [
  { value: "popular", label: "Сначала рекомендуемые" },
  { value: "price-asc", label: "Цена: по возрастанию" },
  { value: "price-desc", label: "Цена: по убыванию" },
  { value: "name", label: "По названию" },
] as const;

function sortLabel(value: string) {
  return SORT_OPTIONS.find((option) => option.value === value)?.label ?? "Сортировка";
}

const PAGE_SIZES = [25, 50] as const;
type PageSize = (typeof PAGE_SIZES)[number];

function PageSizeSwitcher({
  value,
  onChange,
  dark = false,
}: {
  value: PageSize;
  onChange: (size: PageSize) => void;
  dark?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${dark ? "text-white/50" : "text-steel"}`}>
      <span className="uppercase tracking-[0.14em]">Показывать</span>
      {PAGE_SIZES.map((size) => {
        const active = value === size;
        return (
          <button
            key={size}
            type="button"
            aria-label={`Показывать по ${size}`}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 ${
              active
                ? "bg-orange text-white"
                : dark
                  ? "bg-white/10 text-white hover:bg-white/15"
                  : "bg-muted/70 hover:bg-muted"
            }`}
            onClick={() => onChange(size)}
          >
            {size}
          </button>
        );
      })}
    </div>
  );
}

function CatalogPager({
  page,
  pages,
  pageSize,
  onPage,
  onPageSize,
  dark = false,
}: {
  page: number;
  pages: number;
  pageSize: PageSize;
  onPage: (next: number) => void;
  onPageSize: (next: PageSize) => void;
  dark?: boolean;
}) {
  if (pages <= 1) return null;

  return (
    <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <div className="flex justify-center gap-2">
        {Array.from({ length: pages }, (_, i) => (
          <Button
            key={i}
            variant={page === i + 1 ? "default" : "outline"}
            className={
              page === i + 1 || !dark
                ? undefined
                : "border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
            }
            onClick={() => onPage(i + 1)}
          >
            {i + 1}
          </Button>
        ))}
      </div>
      <PageSizeSwitcher value={pageSize} onChange={onPageSize} dark={dark} />
    </div>
  );
}

function CatalogFilters({
  categories,
  specFilters,
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
  length,
  setLength,
  weight,
  setWeight,
  tex,
  setTex,
  knitClass,
  setKnitClass,
  inStockOnly,
  setInStockOnly,
  setPage,
  onReset,
}: {
  categories: CatalogCategory[];
  specFilters: ReturnType<typeof buildSpecFilters>;
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
  length: string[];
  setLength: Dispatch<SetStateAction<string[]>>;
  weight: string[];
  setWeight: Dispatch<SetStateAction<string[]>>;
  tex: string[];
  setTex: Dispatch<SetStateAction<string[]>>;
  knitClass: string[];
  setKnitClass: Dispatch<SetStateAction<string[]>>;
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
      <div className="mt-2 flex flex-wrap gap-1">
        <button
          type="button"
          className={`rounded-full px-2.5 py-1 text-xs ${category === "all" ? "bg-orange text-white" : "bg-muted/70 hover:bg-muted"}`}
          onClick={() => setCat("all")}
        >
          Все
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={`rounded-full px-2.5 py-1 text-xs ${category === c.slug ? "bg-orange text-white" : "bg-muted/70 hover:bg-muted"}`}
            onClick={() => setCat(c.slug)}
          >
            {c.short}
          </button>
        ))}
      </div>
      <Accordion
        multiple
        defaultValue={[
          "Основа",
          "Покрытие",
          "Цвет",
          "Размер",
          "Длина модели",
          "Вес пары",
          "Текс",
          "Класс вязки",
        ]}
        className="mt-3"
      >
        {(
          [
            ["Основа", specFilters.base, base, setBase],
            ["Покрытие", specFilters.coating, coating, setCoating],
            ["Цвет", specFilters.color, color, setColor],
            ["Размер", specFilters.size, size, setSize],
            ["Длина модели", specFilters.length, length, setLength],
            ["Вес пары", specFilters.weight, weight, setWeight],
            ["Текс", specFilters.tex, tex, setTex],
            ["Класс вязки", specFilters.knitClass, knitClass, setKnitClass],
          ] as const
        ).map(([title, options, selected, setter]) => (
          <AccordionItem key={title} value={title}>
            <AccordionTrigger
              className="items-center py-2 text-xs font-normal uppercase tracking-[0.18em] text-steel hover:no-underline"
              actions={
                <button
                  type="button"
                  aria-label={`Сбросить фильтры: ${title}`}
                  disabled={!selected.length}
                  className="shrink-0 rounded-md p-0.5 text-muted-foreground outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-25"
                  onClick={() => {
                    setter([]);
                    setPage(1);
                  }}
                >
                  <X className="size-3.5" strokeWidth={2.25} />
                </button>
              }
            >
              <span>
                {title}
                {selected.length ? (
                  <span className="ml-1.5 text-orange">{selected.length}</span>
                ) : null}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className={title === "Цвет" ? "grid gap-0.5" : "grid gap-1.5"}>
                {options.map((opt) => {
                  const swatch = title === "Цвет" ? COLOR_SWATCH[opt] : undefined;
                  const isOn = selected.includes(opt);
                  return (
                    <label
                      key={opt}
                      className={
                        swatch
                          ? `flex w-full cursor-pointer items-center gap-2 rounded-[4px] px-1.5 py-[3px] text-sm ${
                              isOn
                                ? "bg-[#cce8ff] ring-1 ring-inset ring-[#99d1ff]"
                                : "hover:bg-[#e8e8e8]"
                            }`
                          : "flex items-center gap-2 text-sm"
                      }
                    >
                      <Checkbox
                        checked={isOn}
                        onCheckedChange={() => toggle(selected, opt, setter)}
                        className={swatch ? COLOR_SWATCH_CLASS : undefined}
                        style={swatch ? { backgroundColor: swatch } : undefined}
                      />
                      {title === "Класс вязки" ? opt.replace(".", ",") : opt}
                    </label>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
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

export function CatalogBrowser({
  products,
  categories,
}: {
  products: Product[];
  categories: CatalogCategory[];
}) {
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
  const [length, setLength] = useState<string[]>([]);
  const [weight, setWeight] = useState<string[]>([]);
  const [tex, setTex] = useState<string[]>([]);
  const [knitClass, setKnitClass] = useState<string[]>([]);
  const [sort, setSort] = useState("popular");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (q && !`${p.name} ${p.sku} ${p.base} ${p.coating}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      if (base.length && !base.includes(p.base)) return false;
      if (coating.length && !coating.includes(p.coating)) return false;
      if (color.length && !color.includes(p.color)) return false;
      if (size.length && !p.sizes.some((s) => size.includes(s))) return false;
      if (length.length && (!p.length || !length.includes(p.length))) return false;
      if (!productMatchesWeightFilters(p.weight, weight)) return false;
      if (tex.length && (!p.tex || !tex.includes(p.tex))) return false;
      if (knitClass.length && (!p.knitClass || !knitClass.includes(p.knitClass))) return false;
      if (inStockOnly && p.stock <= 0) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => catalogPrice(a) - catalogPrice(b));
    if (sort === "price-desc") list = [...list].sort((a, b) => catalogPrice(b) - catalogPrice(a));
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return list;
  }, [products, category, q, base, coating, color, size, length, weight, tex, knitClass, sort, inStockOnly]);
  const specFilters = useMemo(() => buildSpecFilters(products), [products]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const slice = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeCategory = categories.find((c) => c.slug === category);

  function changePageSize(next: PageSize) {
    setPageSize(next);
    setPage(1);
  }

  function setCat(next: string) {
    setCategory(next);
    setPage(1);
    const sp = new URLSearchParams(params.toString());
    if (next === "all") sp.delete("category");
    else sp.set("category", next);
    router.replace(`/catalog${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      document.getElementById("catalog-models")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function reset() {
    setBase([]);
    setCoating([]);
    setColor([]);
    setSize([]);
    setLength([]);
    setWeight([]);
    setTex([]);
    setKnitClass([]);
    setInStockOnly(false);
    setQ("");
    setCat("all");
  }

  const filterProps = {
    categories,
    specFilters,
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
    length,
    setLength,
    weight,
    setWeight,
    tex,
    setTex,
    knitClass,
    setKnitClass,
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
        className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
      />
      <Select value={sort} onValueChange={(v) => v && setSort(v)}>
        <SelectTrigger className="w-full border-white/15 bg-white/5 text-white sm:w-56">
          <SelectValue placeholder="Сортировка">{sortLabel(sort)}</SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <>
      <div className="bg-ink text-paper xl:hidden">
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
        <CatalogCategoryTiles
          categories={categories}
          products={products}
          active={category}
          onSelect={setCat}
        />
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/50">
              Найдено {filtered.length} моделей. Цены и остатки — из 1С.
            </p>
            <PageSizeSwitcher value={pageSize} onChange={changePageSize} dark />
          </div>
          {slice.length ? (
            <div className="mt-5 grid auto-rows-fr grid-cols-2 items-stretch gap-3 lg:grid-cols-3">
              {slice.map((p) => (
                <CatalogShopCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/50">
              Нет товаров по фильтрам. Сбросьте условия или запросите подбор.
            </div>
          )}
          <CatalogPager
            page={currentPage}
            pages={pages}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={changePageSize}
            dark
          />
        </div>
      </div>

      <div className="mx-auto hidden max-w-6xl items-start gap-8 px-4 py-10 [overflow-anchor:none] xl:grid xl:grid-cols-[260px_1fr]">
        <aside className="sticky top-24 z-10 h-fit max-h-[calc(100vh-7rem)] self-start overflow-y-auto rounded-2xl border bg-card p-4 [scrollbar-width:thin] [scrollbar-color:var(--orange)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange">
          <CatalogFilters {...filterProps} />
        </aside>
        <div className="min-h-[max(80rem,calc(100svh-8rem))]">
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
                <SelectValue placeholder="Сортировка">{sortLabel(sort)}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-steel">
              Найдено {filtered.length} моделей. Цены и остатки — из 1С.
            </p>
            <PageSizeSwitcher value={pageSize} onChange={changePageSize} />
          </div>
          {slice.length ? (
            <div className="mt-6 grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {slice.map((p) => (
                <ProductCard key={p.id} product={p} showShift={false} />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed p-10 text-center text-steel">
              Нет товаров по фильтрам. Сбросьте условия или запросите подбор.
            </div>
          )}
          <CatalogPager
            page={currentPage}
            pages={pages}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={changePageSize}
          />
        </div>
      </div>
    </>
  );
}

export type { CategorySlug };
