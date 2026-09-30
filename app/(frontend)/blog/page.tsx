import Link from "next/link";
import { getArticles } from "@/lib/server/catalog";
import { formatDate } from "@/lib/format";
import { brand } from "@/lib/brand";

import { pageMeta } from "@/lib/seo-jsonld";
import { MediaImage } from "@/components/media-image";

export const metadata = pageMeta("Статьи", `Материалы ${brand.markRu} для закупщиков: подбор, покрытия, производство.`, "/blog");

export default async function BlogPage() {
  const articles = await getArticles();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-4xl">Статьи</h1>
      <p className="mt-3 max-w-2xl text-steel">
        Материалы {brand.markRu} для закупщиков: подбор, покрытия, производство.
      </p>
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
    </div>
  );
}
