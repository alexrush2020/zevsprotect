import type { Article, CategorySlug, Product } from "@/lib/types";
import type { ProductReview } from "@/lib/data/product-reviews";
import type { Media, Post, PostCategory, Product as ProductDoc, Category, Review } from "@/payload/payload-types";

/** Чистый маппинг документов Payload -> типы lib/types.ts. Без обращения к БД. */

export type CatalogCategory = {
  slug: CategorySlug;
  name: string;
  short: string;
  description: string;
  image: string;
};

const populated = <T extends object>(v: number | T | null | undefined): T | null =>
  v && typeof v === "object" ? v : null;

const mediaUrl = (m: number | Media | null | undefined) => populated(m)?.url ?? "";

type LexNode = { type?: string; text?: string; children?: LexNode[] };

const inline = (n: LexNode): string =>
  n.type === "linebreak" ? "\n" : (n.text ?? "") + (n.children ?? []).map(inline).join("");

/** Lexical -> абзацы (список — по элементу на строку, вложенность не сохраняется). */
export function lexicalToParagraphs(value: unknown): string[] {
  const root = (value as { root?: LexNode } | null | undefined)?.root;
  const out: string[] = [];
  const walk = (n: LexNode) => {
    if (n.type === "list" || n.type === "quote") return (n.children ?? []).forEach(walk);
    const t = inline(n).trim();
    if (t) out.push(t);
  };
  (root?.children ?? []).forEach(walk);
  return out;
}

export function mapCategory(doc: Category): CatalogCategory {
  return {
    slug: doc.slug as CategorySlug,
    name: doc.title,
    short: doc.title, // в коллекции нет «короткого имени»
    description: "", // в коллекции нет описания
    image: mediaUrl(doc.image),
  };
}

export function mapProduct(doc: ProductDoc): Product {
  const images = (doc.gallery ?? []).map((g) => mediaUrl(g.image)).filter(Boolean);
  const documents = (doc.documents ?? [])
    .map((d) => ({ title: d.title, href: mediaUrl(d.file) }))
    .filter((d) => d.href);
  return {
    id: String(doc.id),
    slug: doc.slug,
    name: doc.title,
    sku: doc.sku,
    category: (populated(doc.category)?.slug ?? "") as CategorySlug,
    base: doc.base ?? "",
    coating: doc.coating ?? "",
    color: (doc.colors ?? []).join(", "),
    sizes: doc.sizes ?? [],
    price: doc.price ?? 0,
    minQty: doc.minQty ?? 50,
    ...(doc.packSizes?.length ? { packSizes: doc.packSizes } : {}),
    stock: doc.stock ?? 0,
    unit: doc.unit ?? "пара",
    ...(doc.weight ? { weight: doc.weight } : {}),
    ...(doc.length ? { length: doc.length } : {}),
    ...(doc.tex ? { tex: doc.tex } : {}),
    ...(doc.knitClass ? { knitClass: doc.knitClass } : {}),
    ...(doc.coatingType ? { coatingType: doc.coatingType } : {}),
    description: lexicalToParagraphs(doc.description).join("\n\n"),
    image: images[0] ?? "",
    images,
    ...(doc.badges?.includes("home") ? { featured: true } : {}),
    ...(documents.length ? { documents } : {}),
  };
}

export function mapArticle(doc: Post): Article {
  const slides = (doc.slides ?? [])
    .map((s) => ({ src: mediaUrl(s.image), title: s.title ?? "", alt: s.alt ?? "" }))
    .filter((s) => s.src);
  return {
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt,
    date: (doc.publishedAt ?? doc.createdAt).slice(0, 10),
    category: populated<PostCategory>(doc.category)?.title ?? "",
    image: mediaUrl(doc.cover) || slides[0]?.src || "",
    content: lexicalToParagraphs(doc.content),
    ...(slides.length ? { slides } : {}),
    home: !!doc.home,
  };
}

export function mapProductReview(doc: Review): ProductReview {
  const product = populated(doc.product);
  return {
    id: String(doc.id),
    productSlug: product?.slug ?? "",
    productTitle: product?.title ?? "",
    author: doc.authorName,
    rating: doc.rating,
    text: doc.text,
    date: new Date(doc.createdAt).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' }),
    // нет в коллекции reviews — см. отчёт S-7
    orderDate: "",
    shipped: false,
    tags: [],
  };
}
