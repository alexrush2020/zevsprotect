import type { Article, Product } from "@/lib/types";
import type { ProductReview } from "@/lib/data/product-reviews";
import type { CatalogCategory } from "@/lib/server/map";

/** Чистый маппинг мок-данных прототипа -> данные коллекций Payload (без БД). Обратный к lib/server/map.ts. */

const WP = "https://zevsprotect.ru/wp-content/uploads/";

export const isRemote = (src: string) => /^https?:\/\//.test(src);

/** Уникальное имя файла в Media (upsert-ключ): путь без ведущего «/», «/» -> «-». */
export function mediaFilename(src: string): string {
  const rel = src.startsWith(WP) ? src.slice(WP.length) : src.replace(/^\//, "");
  return rel.replace(/\//g, "-");
}

const RU: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};
export const slugify = (title: string) =>
  [...title.toLowerCase()].map((c) => RU[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const textNode = (text: string) => ({ type: "text", version: 1, text, format: 0, detail: 0, mode: "normal", style: "" });

/** Абзацы -> Lexical (обратно: lexicalToParagraphs). */
export const toLexical = (paragraphs: string[]) => ({
  root: {
    type: "root", version: 1, direction: "ltr" as const, format: "" as const, indent: 0,
    children: paragraphs.map((t) => ({
      type: "paragraph", version: 1, direction: "ltr" as const, format: "" as const, indent: 0, textFormat: 0, textStyle: "",
      children: [textNode(t)],
    })),
  },
});

export const splitParagraphs = (text: string) => text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);

export function categoryData(c: CatalogCategory, order: number, imageId?: number) {
  return { title: c.name, slug: c.slug, short: c.short, description: c.description, order, ...(imageId ? { image: imageId } : {}) };
}

export type ProductRefs = { categoryId: number; imageIds: number[]; documents: { title: string; fileId: number }[] };

export function productData(p: Product, r: ProductRefs) {
  return {
    title: p.name,
    slug: p.slug,
    sku: p.sku,
    category: r.categoryId,
    description: toLexical(splitParagraphs(p.description)),
    base: p.base,
    coating: p.coating,
    coatingType: p.coatingType,
    colors: p.color.split(",").map((s) => s.trim()).filter(Boolean),
    sizes: p.sizes,
    knitClass: p.knitClass,
    tex: p.tex,
    weight: p.weight,
    length: p.length,
    gallery: r.imageIds.map((image) => ({ image })),
    documents: r.documents.map((d) => ({ title: d.title, file: d.fileId })),
    price: p.price,
    stock: p.stock,
    unit: p.unit,
    minQty: p.minQty,
    packSizes: p.packSizes ?? [],
    badges: p.featured ? ["home" as const] : [],
    _status: "published" as const,
  };
}

export function postData(a: Article, r: { categoryId?: number; coverId?: number; slideIds: (number | undefined)[] }) {
  return {
    title: a.title,
    slug: a.slug,
    category: r.categoryId,
    cover: r.coverId,
    excerpt: a.excerpt,
    content: toLexical(a.content),
    slides: (a.slides ?? []).flatMap((s, i) => (r.slideIds[i] ? [{ image: r.slideIds[i]!, title: s.title, alt: s.alt }] : [])),
    publishedAt: `${a.date}T09:00:00.000+03:00`,
    home: !!a.home,
    _status: "published" as const,
  };
}

/** Отзыв: ключ upsert — (product, authorName, text). Даты — полдень по Москве, чтобы день не «уехал». */
export function reviewData(r: ProductReview, productId: number) {
  const d = (s: string) => `${s}T12:00:00.000+03:00`;
  return {
    product: productId,
    authorName: r.author,
    rating: r.rating,
    text: r.text,
    colorLabel: r.colorLabel,
    sizeLabel: r.sizeLabel,
    orderDate: r.orderDate ? d(r.orderDate) : undefined,
    shipped: r.shipped,
    shippedAt: r.shippedAt ? d(r.shippedAt) : undefined,
    recommends: r.recommends,
    tags: r.tags,
    approved: !r.pendingModeration,
    createdAt: d(r.date),
  };
}
