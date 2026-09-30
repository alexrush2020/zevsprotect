import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductBuy } from "@/components/product-buy";
import { ProductShiftCompare } from "@/components/product-shift-compare";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ProductReviewsSection } from "@/components/product-reviews/product-reviews-section";
import { Badge } from "@/components/ui/badge";
import { productDocuments, productGallery, productSeo, withMockIds } from "@/lib/data/catalog";
import { reviewCountLabel, reviewStats } from "@/lib/data/product-reviews";
import {
  getCategories,
  getOtherProductReviews,
  getProduct,
  getProductReviews,
  getProducts,
  getRelatedProducts,
} from "@/lib/server/catalog";
import { formatPrice } from "@/lib/format";
import { brand } from "@/lib/brand";
import { catalogPrice } from "@/lib/lots";
import { productMinQty } from "@/lib/order-qty";
import { jsonLdScript, productJsonLd } from "@/lib/product-jsonld";
import { formatVolumeQty } from "@/lib/volume-quote";

// Опубликованные товары пререндерятся; новые — по запросу, снятые с публикации — 404 после сброса тега catalog.
export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

/** Товар из Payload; id и деньги — из мока (withMockIds), как в корзине, до SH-CART. */
async function loadProduct(slug: string) {
  const raw = await getProduct(slug);
  if (!raw) return null;
  const [product] = withMockIds([raw]);
  const category = (await getCategories()).find((c) => c.slug === product.category);
  return { product, category };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadProduct(slug);
  if (!data) return {};
  const { product, category } = data;
  const seo = productSeo(product, category?.short);
  const image = productGallery(product, category?.image)[0];
  return {
    title: { absolute: seo.title },
    description: seo.description,
    openGraph: { title: seo.title, description: seo.description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadProduct(slug);
  if (!data) notFound();
  const { product, category } = data;
  const [relatedRaw, catalog, approved] = await Promise.all([
    getRelatedProducts(slug, 4),
    getProducts(),
    getProductReviews(slug),
  ]);
  const others = approved.length ? [] : await getOtherProductReviews(slug, 3);
  const related = withMockIds(relatedRaw);
  const docs = productDocuments(product);
  const gallery = productGallery(product, category?.image);
  const seo = productSeo(product, category?.short);
  const inStock = product.stock > 0;
  const stats = reviewStats(product.slug, approved);
  const jsonLd = productJsonLd(product, gallery, stats);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <p className="text-sm text-steel">
        <Link href="/catalog">Каталог</Link> /{" "}
        <Link href={`/catalog?category=${product.category}`}>{category?.short}</Link>{" "}
        / {product.name}
      </p>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <ProductGallery images={gallery} alt={product.name} />
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-steel">
            {product.sku} · данные из 1С
          </p>
          <h1 className="mt-2 font-heading text-4xl">{seo.h1}</h1>
          <Link
            href="#reviews"
            className="mt-2 inline-block text-sm text-steel hover:text-orange"
          >
            {reviewCountLabel(stats.count)}
          </Link>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">{category?.name}</Badge>
            <Badge variant="outline">{product.base}</Badge>
            <Badge variant="outline">{product.coating}</Badge>
            <Badge variant="outline">{product.color}</Badge>
            <Badge variant={inStock ? "secondary" : "outline"}>
              {inStock ? "В наличии" : "Под заказ"}
            </Badge>
          </div>
          <p className="mt-6 text-3xl font-semibold">
            {formatPrice(catalogPrice(product))}
            <span className="ml-2 text-base font-normal text-steel">
              / {product.unit}
            </span>
          </p>
          <p className="mt-2 text-sm text-steel">
            {inStock
              ? `Остаток: ${product.stock} ${product.unit} · мин. заказ ${formatVolumeQty(productMinQty(product), product.unit)}`
              : `Нет на складе. Можно запросить срок партии. Мин. заказ ${formatVolumeQty(productMinQty(product), product.unit)}.`}
          </p>
          <ProductShiftCompare product={product} catalog={withMockIds(catalog)} />
          <p className="mt-4 text-steel">{product.description}</p>
          <div className="mt-6">
            <ProductBuy product={product} />
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-4 rounded-2xl border bg-card p-6 md:grid-cols-2">
        <h2 className="font-heading text-2xl md:col-span-2">Характеристики</h2>
        {[
          ["Основа", product.base],
          ["Покрытие", product.coating],
          ["Вид покрытия", product.coatingType || "—"],
          ["Цвет", product.color],
          ["Размеры", product.sizes.join(", ")],
          ["Вес пары", product.weight || "—"],
          ["Длина", product.length || "—"],
          ["Текс", product.tex || "—"],
          ["Класс вязки", product.knitClass || "—"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b py-2 text-sm">
            <span className="text-steel">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
        <div className="md:col-span-2 pt-4">
          <p className="text-sm font-medium">Документы</p>
          <ul className="mt-2 space-y-1">
            {docs.map((d) => (
              <li key={d.title}>
                <a href={d.href} className="text-sm text-orange underline" target="_blank" rel="noreferrer">
                  {d.title}
                </a>
                <span className="text-sm text-steel"> — PDF-мок</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ProductReviewsSection product={product} approved={approved} others={others} />

      <section className="mt-12 rounded-2xl border bg-card p-6">
        <h2 className="font-heading text-2xl">Для поисковых систем</h2>
        <p className="mt-3 text-sm text-steel">{seo.description}</p>
        <p className="mt-2 text-sm text-steel">
          Купить {product.name} ({product.sku}) оптом от производителя {brand.markRu}{" "}
          в Таганроге. Категория: {category?.name}. Цена указана с НДС, остатки —
          мок обмена с 1С.
        </p>
      </section>

      {related.length ? (
        <div className="mt-12">
          <h2 className="font-heading text-2xl">Похожие модели</h2>
          <div className="mt-6 grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
