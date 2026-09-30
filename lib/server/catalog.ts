import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";
import type { Article, Product } from "@/lib/types";
import { parseCounterId } from "@/lib/analytics";
import type { ProductReview } from "@/lib/data/product-reviews";
import {
  mapArticle,
  mapCategory,
  mapProduct,
  mapProductReview,
  type CatalogCategory,
} from "@/lib/server/map";
import {
  ABOUT_DEFAULTS,
  CONTACTS_DEFAULTS,
  DELIVERY_DEFAULTS,
  HOME_DEFAULTS,
  PRIVACY_DEFAULTS,
  PRIVACY_PAGE_SLUG,
  mapAbout,
  mapContacts,
  mapDelivery,
  mapHome,
  mapPageParagraphs,
} from "@/lib/server/content";

/**
 * Серверный слой данных витрины (Local API). Читаем с overrideAccess:false без user —
 * работают access коллекций: черновики недоступны, отзывы — только одобренные.
 * Кэш: unstable_cache + теги; сброс — payload/hooks/revalidate.ts (afterChange/afterDelete).
 * Теги: catalog (товары, категории, отзывы), blog (статьи, рубрики), content (глобалы, pages).
 * ponytail: unstable_cache (Cache Components не включены); при переходе на 'use cache' заменить cached().
 */

const cached = <A extends unknown[], R>(fn: (...a: A) => Promise<R>, key: string, tag: string) =>
  unstable_cache(fn, [key], { tags: [tag], revalidate: 300 }); // TTL — страховка, если хук сброса не сработал (фоновый импорт 1С вне запроса Next)

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
    // порядок заведения (сид — в порядке мока): «Сначала рекомендуемые» в каталоге, как в прототипе
    const { docs } = await payload.find({ collection: "products", ...read, sort: "id" });
    return docs.map(mapProduct);
  },
  "products",
  "catalog",
);

/**
 * Каталог для клиента (корзина, избранное, быстрый заказ): все опубликованные товары без тяжёлых
 * полей — описание, галерея и документы нужны только карточке товара. Передаётся из layout в StoreProvider.
 */
export async function getClientCatalog(): Promise<Product[]> {
  return (await getProducts()).map((p) => ({ ...p, description: "", images: [], documents: undefined }));
}

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
      limit,
      sort: "id", // порядок заведения (сид — в порядке мока), как в прототипе
      where: { and: [{ category: { equals: cat } }, { id: { not_equals: doc.id } }] },
    });
    return same.docs.map(mapProduct);
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
      depth: 1,
      sort: "-createdAt",
      where: { "product.slug": { equals: productSlug } },
    });
    return docs.map(mapProductReview);
  },
  "product-reviews",
  "catalog",
);

/** Одобренные отзывы о других товарах — для карточки товара без отзывов. */
export const getOtherProductReviews = cached(
  async (excludeSlug: string, limit: number): Promise<ProductReview[]> => {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "reviews",
      ...read,
      depth: 1,
      pagination: true,
      limit,
      sort: "id",
      where: { "product.slug": { not_equals: excludeSlug } },
    });
    return docs.map(mapProductReview);
  },
  "other-product-reviews",
  "catalog",
);

export const getArticles = cached(
  async (): Promise<Article[]> => {
    const payload = await getPayload({ config });
    // при равной дате — порядок создания (как в моке прототипа)
    const { docs } = await payload.find({ collection: "posts", ...read, sort: ["-publishedAt", "createdAt"] });
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

/*
 * Контент (тег 'content'): глобалы home/about/delivery/settings и страницы pages; маппинг и тексты
 * по умолчанию — lib/server/content.ts. Сбой чтения -> тексты по умолчанию, страница не падает.
 */
const orDefault = <T>(load: () => Promise<T>, fallback: T, what: string) => () =>
  load().catch((e) => {
    console.error(`[content] ${what}: ${e instanceof Error ? e.message : e}`);
    return fallback;
  });

const findGlobal = async <S extends "home" | "about" | "delivery" | "settings">(slug: S, depth: number) =>
  (await getPayload({ config })).findGlobal({ slug, overrideAccess: false, depth });

export const getHomeContent = orDefault(
  cached(async () => mapHome(await findGlobal("home", 1)), "home-content", "content"),
  HOME_DEFAULTS,
  "home",
);

export const getAboutContent = orDefault(
  cached(async () => mapAbout(await findGlobal("about", 1)), "about-content", "content"),
  ABOUT_DEFAULTS,
  "about",
);

export const getDeliveryContent = orDefault(
  cached(async () => mapDelivery(await findGlobal("delivery", 0)), "delivery-content", "content"),
  DELIVERY_DEFAULTS,
  "delivery",
);

export const getSiteContacts = orDefault(
  cached(async () => mapContacts(await findGlobal("settings", 0)), "site-contacts", "content"),
  CONTACTS_DEFAULTS,
  "settings",
);

/** ID Яндекс.Метрики (Settings → «Счётчики»); пусто, не число или сбой чтения -> null, счётчик выключен. */
export const getMetrikaId = orDefault(
  cached(async () => parseCounterId((await findGlobal("settings", 0)).analytics?.yandexMetrika), "metrika-id", "content"),
  null,
  "settings.analytics",
);

export const getPrivacyText = orDefault(
  cached(
    async () => {
      const { docs } = await (await getPayload({ config })).find({
        collection: "pages",
        ...read,
        depth: 0,
        limit: 1,
        where: { slug: { equals: PRIVACY_PAGE_SLUG } },
      });
      return mapPageParagraphs(docs[0], PRIVACY_DEFAULTS);
    },
    "privacy-page",
    "content",
  ),
  PRIVACY_DEFAULTS,
  "privacy",
);
