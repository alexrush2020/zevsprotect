import Link from "next/link";
import { getArticles } from "@/lib/server/catalog";
import { formatDate } from "@/lib/format";
import { brand } from "@/lib/brand";

import { pageMeta } from "@/lib/seo-jsonld";
import { MediaImage } from "@/components/media-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = pageMeta("Статьи", `Материалы ${brand.markRu} для закупщиков: подбор, покрытия, производство.`, "/blog");

const PAGE_SIZE = 6;

type Query = { cat?: string; q?: string; page?: string };

function href({ cat, q, page }: Query) {
  const params = new URLSearchParams();
  if (cat) params.set("cat", cat);
  if (q) params.set("q", q);
  if (page && page !== "1") params.set("page", page);
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const cat = first(sp.cat).trim();
  const q = first(sp.q).trim().slice(0, 100);
  const needle = q.toLowerCase();

  const all = await getArticles();
  const categories = [...new Set(all.map((a) => a.category).filter(Boolean))];
  const found = all.filter(
    (a) =>
      (!cat || a.category === cat) &&
      (!needle || `${a.title} ${a.excerpt}`.toLowerCase().includes(needle)),
  );
  const pages = Math.max(1, Math.ceil(found.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(first(sp.page), 10) || 1));
  const articles = found.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-4xl">Статьи</h1>
      <p className="mt-3 max-w-2xl text-steel">
        Материалы {brand.markRu} для закупщиков: подбор, покрытия, производство.
      </p>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {categories.length > 1 ? (
          <nav aria-label="Рубрики" className="flex flex-wrap gap-2">
            {[{ title: "", label: "Все" }, ...categories.map((c) => ({ title: c, label: c }))].map((c) => (
              <Link
                key={c.label}
                href={href({ cat: c.title, q })}
                aria-current={cat === c.title ? "page" : undefined}
                className={`rounded-full border px-3 py-1 text-sm ${cat === c.title ? "border-ink bg-ink text-white" : "bg-card text-steel hover:text-ink"}`}
              >
                {c.label}
              </Link>
            ))}
          </nav>
        ) : (
          <span />
        )}
        <form action="/blog" method="get" role="search" className="flex gap-2">
          {cat ? <input type="hidden" name="cat" value={cat} /> : null}
          <Input name="q" defaultValue={q} placeholder="Поиск по статьям" aria-label="Поиск по статьям" className="w-full md:w-64" />
          <Button type="submit" variant="outline">
            Найти
          </Button>
        </form>
      </div>

      {articles.length === 0 ? (
        <p className="mt-10 text-steel">
          Ничего не найдено.{" "}
          <Link href="/blog" className="underline underline-offset-4 hover:text-ink">
            Показать все статьи
          </Link>
        </p>
      ) : (
        <div className="mt-8 grid auto-rows-fr items-stretch gap-5 md:grid-cols-2">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card"
            >
              <div className="aspect-[4/3] bg-muted">
                <MediaImage src={a.image} alt="" className="h-full w-full object-contain object-center" />
              </div>
              <div className="p-5">
                <p className="text-xs text-steel">
                  {a.category} · {formatDate(a.date)}
                </p>
                <h2 className="mt-2 line-clamp-3 font-heading text-xl leading-snug">{a.title}</h2>
                <p className="mt-2 text-sm text-steel">{a.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 ? (
        <nav aria-label="Страницы" className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => String(i + 1)).map((n) => (
            <Link
              key={n}
              href={href({ cat, q, page: n })}
              aria-current={Number(n) === page ? "page" : undefined}
              className={`min-w-9 rounded-lg border px-3 py-1.5 text-center text-sm ${Number(n) === page ? "border-ink bg-ink text-white" : "bg-card text-steel hover:text-ink"}`}
            >
              {n}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
