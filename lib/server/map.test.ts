import { describe, expect, it } from "vitest";
import type { Category, Post, Product, Review } from "@/payload/payload-types";
import { lexicalToParagraphs, mapArticle, mapCategory, mapProduct, mapProductReview } from "./map";

const media = (id: number, url: string) => ({ id, url, updatedAt: "", createdAt: "" });
const lex = (...paras: string[]) => ({
  root: { type: "root", children: paras.map((t) => ({ type: "paragraph", children: [{ type: "text", text: t }] })) },
});

describe("lexicalToParagraphs", () => {
  it("абзацы, пустые пропускаются, null безопасен", () => {
    expect(lexicalToParagraphs(lex("Один", " ", "Два"))).toEqual(["Один", "Два"]);
    expect(lexicalToParagraphs(null)).toEqual([]);
  });
  it("элементы списка — отдельные строки", () => {
    const v = { root: { children: [{ type: "list", children: [
      { type: "listitem", children: [{ type: "text", text: "а" }] },
      { type: "listitem", children: [{ type: "text", text: "б" }] },
    ] }] } };
    expect(lexicalToParagraphs(v)).toEqual(["а", "б"]);
  });
});

describe("mapProduct", () => {
  const doc = {
    id: 7,
    slug: "feniks",
    title: "Перчатки «Феникс»",
    sku: "ZP-FENIX-XL",
    category: { id: 2, slug: "zhar", title: "Жар" },
    base: "Арселон",
    coating: "Без покрытия",
    colors: ["Оранжевый", "Серый"],
    sizes: ["XL"],
    price: 710,
    stock: 420,
    unit: "пара",
    minQty: 50,
    packSizes: [10, 40],
    weight: "270–280 г",
    description: lex("Жаропрочные."),
    badges: ["home"],
    gallery: [{ image: media(1, "/media/a.jpg") }, { image: media(2, "/media/b.jpg") }],
    documents: [{ title: "Декларация", file: media(3, "/media/d.pdf") }],
  } as unknown as Product;

  it("Payload-документ -> Product", () => {
    expect(mapProduct(doc)).toEqual({
      id: "7",
      slug: "feniks",
      name: "Перчатки «Феникс»",
      sku: "ZP-FENIX-XL",
      category: "zhar",
      base: "Арселон",
      coating: "Без покрытия",
      color: "Оранжевый, Серый",
      sizes: ["XL"],
      price: 710,
      minQty: 50,
      packSizes: [10, 40],
      stock: 420,
      unit: "пара",
      weight: "270–280 г",
      description: "Жаропрочные.",
      image: "/media/a.jpg",
      images: ["/media/a.jpg", "/media/b.jpg"],
      featured: true,
      documents: [{ title: "Декларация", href: "/media/d.pdf" }],
    });
  });

  it("пустые необязательные поля не попадают в объект; непопулированные связи не падают", () => {
    const p = mapProduct({ id: 1, slug: "s", title: "T", sku: "K", category: 5 } as unknown as Product);
    expect(p).toMatchObject({ category: "", image: "", images: [], price: 0, minQty: 50, unit: "пара", sizes: [] });
    expect("featured" in p || "documents" in p || "weight" in p).toBe(false);
  });
});

describe("mapArticle / mapCategory / mapProductReview", () => {
  it("Post -> Article", () => {
    const a = mapArticle({
      id: 1, slug: "guide", title: "Гид", excerpt: "Анонс",
      category: { id: 1, title: "Закупка", slug: "zakupka" },
      publishedAt: "2026-09-17T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z",
      cover: media(1, "/c.png"), content: lex("П1", "П2"),
      slides: [{ image: media(2, "/s.png"), title: "Слайд" }], home: true,
      updatedAt: "2026-09-18T00:00:00.000Z", meta: { title: "SEO", image: media(3, "/o.png") },
    } as unknown as Post);
    expect(a).toEqual({
      slug: "guide", title: "Гид", excerpt: "Анонс", date: "2026-09-17", category: "Закупка",
      image: "/c.png", content: ["П1", "П2"], slides: [{ src: "/s.png", title: "Слайд", alt: "" }], home: true,
      updatedAt: "2026-09-18T00:00:00.000Z", seo: { title: "SEO", image: "/o.png" },
    });
  });
  it("обложка по умолчанию — первый слайд; дата — createdAt", () => {
    const a = mapArticle({
      id: 1, slug: "x", title: "X", excerpt: "e", createdAt: "2026-02-03T10:00:00.000Z",
      slides: [{ image: media(2, "/s.png") }],
    } as unknown as Post);
    expect(a).toMatchObject({ image: "/s.png", date: "2026-02-03", category: "", home: false });
  });
  it("Category", () => {
    expect(mapCategory({ id: 1, slug: "zhar", title: "Жар", image: media(1, "/z.jpg") } as unknown as Category))
      .toMatchObject({ slug: "zhar", name: "Жар", image: "/z.jpg" });
  });
  it("Review", () => {
    expect(mapProductReview({
      id: 3, product: { id: 7, slug: "feniks", title: "Феникс" }, authorName: "Иван", rating: 5, text: "ок",
      createdAt: "2026-05-06T00:00:00.000Z",
    } as unknown as Review)).toMatchObject({ id: "3", productSlug: "feniks", author: "Иван", date: "2026-05-06" });
  });
});
