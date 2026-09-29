import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";
import type { Article, Product } from "@/lib/types";
import type { ProductReview } from "@/lib/data/product-reviews";
import {
  mapArticle,
  mapCategory,
  mapProduct,
  mapProductReview,
  type CatalogCategory,
} from "@/lib/server/map";

/**
 * Серверный слой данных витрины (Local API). Читаем с overrideAccess:false без user —
 * работают access коллекций: черновики недоступны, отзывы — только одобренные.
 * Кэш: unstable_cache + теги; сброс — payload/hooks/revalidate.ts (afterChange/afterDelete).
 * Теги: catalog (товары, категории, отзывы), blog (статьи, рубрики).
 * ponytail: unstable_cache (Cache Components не включены); при переходе на 'use cache' заменить cached().
 */

const cached = <A extends unknown[], R>(fn: (...a: A) => Promise<R>, key: string, tag: string) =>
  unstable_cache(fn, [key], { tags: [tag] });

const read = { overrideAccess: false, depth: 2, pagination: false } as const;

export const getCategories = cached(
  async (): Promise<CatalogCategory[]> => {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({ collection: "categories", ...read, depth: 1, sort: "order" });
    return docs.map(mapCategory);
  },
  "categories",
  "catalog",
);

export const getProducts = cached(
  async (): Promise<Product[]> => {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({ collection: "products", ...read, sort: "title" });
    return docs.map(mapProduct);
  },
  "products",
  "catalog",
);

export const getProduct = cached(
  async (slug: string): Promise<Product | null> => {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "products",
      ...read,
      limit: 1,
      where: { slug: { equals: slug } },
    });
    return docs[0] ? mapProduct(docs[0]) : null;
  },
  "product",
  "catalog",
);

/** Похожие: выбранные редактором (`related`), иначе та же категория. */
export const getRelatedProducts = cached(
  async (slug: string, limit: number): Promise<Product[]> => {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "products",
      ...read,
      limit: 1,
      where: { slug: { equals: slug } },
    });
    const doc = docs[0];
    if (!doc) return [];
    const picked = (doc.related ?? []).filter((r) => typeof r === "object").map(mapProduct);
    if (picked.length) return picked.slice(0, limit);
    const cat = typeof doc.category === "object" ? doc.category.id : doc.category;
    const same = await payload.find({
      collection: "products",
      ...read,
      limit: limit + 1,
      where: { and: [{ category: { equals: cat } }, { id: { not_equals: doc.id } }] },
    });
    return same.docs.slice(0, limit).map(mapProduct);
  },
  "related",
  "catalog",
);

export const getProductReviews = cached(
  async (productSlug: string): Promise<ProductReview[]> => {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "reviews",
      ...read,
      sort: "-createdAt",
      where: { "product.slug": { equals: productSlug } },
    });
    return docs.map(mapProductReview);
  },
  "product-reviews",
  "catalog",
);

export const getArticles = cached(
  async (): Promise<Article[]> => {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({ collection: "posts", ...read, sort: "-publishedAt" });
    return docs.map(mapArticle);
  },
  "articles",
  "blog",
);

export const getArticle = cached(
  async (slug: string): Promise<Article | null> => {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "posts",
      ...read,
      limit: 1,
      where: { slug: { equals: slug } },
    });
    return docs[0] ? mapArticle(docs[0]) : null;
  },
  "article",
  "blog",
);
