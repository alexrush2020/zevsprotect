import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { Mail, Phone } from "lucide-react";
import { getArticle, getArticles } from "@/lib/server/catalog";
import { formatDate } from "@/lib/format";
import { brand } from "@/lib/brand";
import { jsonLdScript } from "@/lib/product-jsonld";
import { articleJsonLd, breadcrumbJsonLd, pageMeta } from "@/lib/seo-jsonld";
import { Button } from "@/components/ui/button";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { PurchaseGuideCarousel } from "@/components/purchase-guide-carousel";

// Опубликованные статьи пререндерятся; новые рендерятся по запросу (dynamicParams по умолчанию true),
// снятые с публикации отдают 404 после сброса тега blog (payload/hooks/revalidate.ts).
export async function generateStaticParams() {
  return (await getArticles()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Статья" };
  const { seo } = article;
  return pageMeta(
    seo?.title || article.title,
    seo?.description || article.excerpt,
    `/blog/${slug}`,
    seo?.image || article.image || undefined,
    "article",
  );
}

function ArticleBody({ blocks }: { blocks: string[] }) {
  const nodes: ReactNode[] = [];
  let bullets: string[] = [];

  const flushList = () => {
    if (!bullets.length) return;
    const items = bullets;
    bullets = [];
    nodes.push(
      <ul key={`list-${nodes.length}`} className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-3 size-1.5 shrink-0 rounded-full bg-orange" />
            <span>{item.replace(/^—\s*/, "")}</span>
          </li>
        ))}
      </ul>,
    );
  };

  for (const block of blocks) {
    if (block.startsWith("—")) {
      bullets.push(block);
      continue;
    }
    flushList();
    if (/^«.*»$/.test(block)) {
      nodes.push(
        <blockquote
          key={block}
          className="border-l-4 border-orange pl-4 font-heading text-2xl leading-snug text-ink"
        >
          {block}
        </blockquote>,
      );
    } else {
      nodes.push(<p key={block}>{block}</p>);
    }
  }
  flushList();
  return <>{nodes}</>;
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, articles] = await Promise.all([getArticle(slug), getArticles()]);
  if (!article) notFound();
  const related = articles.filter((a) => a.slug !== slug);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      {[
        articleJsonLd({ ...article, updatedAt: article.updatedAt }),
        breadcrumbJsonLd([["Статьи", "/blog"], [article.title, `/blog/${slug}`]]),
      ].map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      ))}
      <p className="text-sm text-steel">
        <Link href="/blog">Статьи</Link> / {article.category}
      </p>
      <h1 className="mt-3 font-heading text-3xl leading-tight sm:text-4xl">
        {article.title}
      </h1>
      <p className="mt-2 text-sm text-steel">{formatDate(article.date)}</p>
      {article.slides?.length ? (
        <div className="mt-8">
          <PurchaseGuideCarousel slides={article.slides} />
        </div>
      ) : article.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image}
          alt=""
          className="mt-8 w-full rounded-2xl object-cover"
        />
      ) : null}
      <div className="mt-8 space-y-5 text-lg leading-8 text-ink/90">
        <ArticleBody blocks={article.content} />
      </div>
      <div className="mt-10 rounded-2xl border bg-card p-6">
        <p className="text-lg leading-8">
          Хотите получить образцы для проверки на вашем производстве? Напишите
          нам — подготовим тестовый комплект под ваши задачи.
        </p>
        <div className="mt-5 flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:items-center">
          <a
            href={`mailto:${brand.email}`}
            className="inline-flex items-center gap-2 font-medium hover:text-orange"
          >
            <Mail className="size-4" />
            {brand.email}
          </a>
          <a
            href={brand.phoneHref}
            className="inline-flex items-center gap-2 font-medium hover:text-orange"
          >
            <Phone className="size-4" />
            Отдел продаж: {brand.phone}
          </a>
        </div>
        <div className="mt-5">
          <InquiryDialog
            type="samples"
            trigger={<Button>Заказать образцы</Button>}
          />
        </div>
      </div>
      {related.length ? (
        <div className="mt-12 border-t pt-8">
          <h2 className="font-heading text-xl">Ещё материалы</h2>
          <ul className="mt-3 space-y-2">
            {related.map((a) => (
              <li key={a.slug}>
                <Link href={`/blog/${a.slug}`} className="hover:text-orange">
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
