/**
 * Сид Payload из мок-данных прототипа: `npm run seed`.
 * Идемпотентен: upsert по slug/sku/filename, ничего не удаляет.
 *   SEED_UPDATE=1       — обновлять уже существующие документы (иначе они пропускаются)
 *   SEED_FORCE=1        — обновлять и товары с manualOverride (только вместе с SEED_UPDATE)
 *   SEED_FETCH_IMAGES=1 — скачивать картинки с zevsprotect.ru в Media (иначе пропускаются и перечисляются)
 * Картинки к уже засеянным документам привязываются только так: SEED_UPDATE=1 SEED_FETCH_IMAGES=1.
 * Известные пределы: ключи upsert (slug, sku, текст отзыва) изменяемы — правка в админке даёт дубль при повторе;
 * SEED_UPDATE заменяет документ целиком (badges, gallery, публикация); фото отзывов не сидятся.
 * Перед запуском — бэкап БД.
 */
process.env.SEED_RUN = "1"; // хуки revalidate вне запроса Next не шумят
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPayload } from "payload";
import config from "@payload-config";
import { articles, categories, products } from "@/lib/data/catalog";
import { sampleProductReviews } from "@/lib/data/product-reviews";
import { categoryData, isRemote, mediaFilename, postData, productData, reviewData, slugify } from "@/lib/seed/map";

const UPDATE = process.env.SEED_UPDATE === "1";
const FORCE = process.env.SEED_FORCE === "1";
const FETCH = process.env.SEED_FETCH_IMAGES === "1";

const MIME: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf",
};

const payload = await getPayload({ config });
const stat: Record<string, { created: number; updated: number; kept: number }> = {};
const skippedMedia = new Set<string>();
const bump = (k: string, what: "created" | "updated" | "kept") => ((stat[k] ??= { created: 0, updated: 0, kept: 0 })[what]++);

type Coll = "categories" | "products" | "posts" | "post-categories" | "reviews";
/** find → update|create. Существующий документ трогаем только при SEED_UPDATE (и manualOverride — только при SEED_FORCE). */
async function upsert(collection: Coll, where: Record<string, unknown>, data: Record<string, unknown>): Promise<number> {
  const found = await payload.find({ collection, where, limit: 1, depth: 0, draft: true, overrideAccess: true } as never);
  const doc = found.docs[0] as { id: number; manualOverride?: boolean; guid1c?: string } | undefined;
  if (!doc) {
    const created = await payload.create({ collection, data, draft: false, overrideAccess: true } as never);
    bump(collection, "created");
    return (created as { id: number }).id;
  }
  if (!UPDATE || (doc.manualOverride && !FORCE)) {
    bump(collection, "kept");
    return doc.id;
  }
  // товар из 1С: цену, остаток и единицу ведёт обмен, сид их не трогает
  if (collection === "products" && doc.guid1c) for (const k of ["price", "stock", "unit"]) delete data[k];
  await payload.update({ collection, id: doc.id, data, draft: false, overrideAccess: true } as never);
  bump(collection, "updated");
  return doc.id;
}

/** Файл -> Media (upsert по filename). Локальный public/… или (по флагу) zevsprotect.ru. undefined — пропущено. */
async function media(src: string, alt: string): Promise<number | undefined> {
  const filename = mediaFilename(src);
  const found = await payload.find({ collection: "media", where: { filename: { equals: filename } }, limit: 1, depth: 0, overrideAccess: true });
  if (found.docs[0]) return found.docs[0].id;
  let data: Buffer;
  try {
    if (isRemote(src)) {
      if (!FETCH) throw new Error("remote");
      const res = await fetch(src, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(String(res.status));
      data = Buffer.from(await res.arrayBuffer());
    } else {
      data = await readFile(path.join(process.cwd(), "public", src));
    }
  } catch {
    skippedMedia.add(src);
    return undefined;
  }
  const mimetype = MIME[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
  const doc = await payload.create({
    collection: "media",
    data: { alt, title: alt },
    file: { data, mimetype, name: filename, size: data.length },
    overrideAccess: true,
  });
  bump("media", "created");
  return doc.id;
}

const ids = <T>(xs: (T | undefined)[]) => xs.filter((x): x is T => x !== undefined);

// 1. категории
const catId: Record<string, number> = {};
for (const [i, c] of categories.entries())
  catId[c.slug] = await upsert("categories", { slug: { equals: c.slug } }, categoryData(c, i, await media(c.image, c.name)));

// 2. товары
const productId: Record<string, number> = {};
for (const p of products) {
  const imageIds = ids(await Promise.all(p.images.map((src) => media(src, p.name))));
  const docs = ids(
    await Promise.all(
      (p.documents ?? []).map(async (d) => {
        const fileId = await media(d.href, d.title);
        return fileId ? { title: d.title, fileId } : undefined;
      }),
    ),
  );
  productId[p.slug] = await upsert("products", { sku: { equals: p.sku } }, productData(p, { categoryId: catId[p.category], imageIds, documents: docs }));
}

// 3. рубрики блога и статьи
const postCatId: Record<string, number> = {};
for (const title of new Set(articles.map((a) => a.category).filter(Boolean)))
  postCatId[title] = await upsert("post-categories", { slug: { equals: slugify(title) } }, { title, slug: slugify(title) });
for (const a of articles) {
  const slideIds = await Promise.all((a.slides ?? []).map((s) => media(s.src, s.alt || s.title)));
  const coverId = await media(a.image, a.title);
  await upsert("posts", { slug: { equals: a.slug } }, postData(a, { categoryId: postCatId[a.category], coverId, slideIds }));
}

// 4. отзывы (ключ — товар + автор + текст)
for (const r of sampleProductReviews) {
  const pid = productId[r.productSlug];
  if (!pid) {
    console.warn(`отзыв ${r.id}: нет товара ${r.productSlug}, пропущен`);
    continue;
  }
  await upsert("reviews", { and: [{ product: { equals: pid } }, { authorName: { equals: r.author } }, { text: { equals: r.text } }] }, reviewData(r, pid));
}

console.table(stat);
if (skippedMedia.size) console.log(`Пропущено картинок (${skippedMedia.size}), нет в public/ (SEED_FETCH_IMAGES=1 — скачать с zevsprotect.ru):\n` + [...skippedMedia].join("\n"));
process.exit(0);
