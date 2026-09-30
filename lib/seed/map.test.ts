import { describe, expect, it } from "vitest";
import { products, articles, categories } from "@/lib/data/catalog";
import { sampleProductReviews } from "@/lib/data/product-reviews";
import type { Category, Post, Product, Review } from "@/payload/payload-types";
import { mapArticle, mapCategory, mapProduct, mapProductReview } from "@/lib/server/map";
import { categoryData, mediaFilename, postData, productData, reviewData, slugify } from "./map";

const m = (id: number, url: string) => ({ id, url, updatedAt: "", createdAt: "" });

describe("productData -> mapProduct", () => {
  it.each([0, 1, products.length - 1])("раундтрип товара #%i", (i) => {
    const p = products[i];
    const data = productData(p, {
      categoryId: 1,
      imageIds: p.images.map((_, k) => k + 1),
      documents: (p.documents ?? []).map((d, k) => ({ title: d.title, fileId: 100 + k })),
    });
    const doc = {
      ...data, id: 1,
      category: { id: 1, slug: p.category, title: "" },
      gallery: data.gallery.map((g) => ({ image: m(g.image, p.images[g.image - 1]) })),
      documents: data.documents.map((d, k) => ({ title: d.title, file: m(d.file, p.documents![k].href) })),
    } as unknown as Product;
    const back = mapProduct(doc);
    for (const k of ["slug", "name", "sku", "category", "base", "coating", "color", "sizes", "price", "minQty", "stock", "unit", "description", "images", "featured", "documents"] as const)
      expect(back[k], k).toEqual(p[k]);
  });
});

describe("категории, статьи, отзывы", () => {
  it("категория", () => {
    const c = categories[0];
    const back = mapCategory({ ...categoryData(c, 0), id: 1, image: m(1, c.image) } as unknown as Category);
    expect(back).toEqual(c);
  });
  it("статья", () => {
    const a = articles[0];
    const d = postData(a, { categoryId: 1, coverId: 1, slideIds: (a.slides ?? []).map((_, i) => i + 1) });
    const back = mapArticle({
      ...d, id: 1, createdAt: "", category: { id: 1, title: a.category, slug: "" },
      cover: m(1, a.image), slides: d.slides.map((s, i) => ({ ...s, image: m(s.image, a.slides![i].src) })),
    } as unknown as Post);
    expect(back).toMatchObject({ slug: a.slug, title: a.title, date: a.date, category: a.category, content: a.content, slides: a.slides, home: false });
    expect(postData(articles[1], { categoryId: 1, coverId: 1, slideIds: [] }).home).toBe(true);
  });
  it("отзыв", () => {
    const r = sampleProductReviews[0];
    const back = mapProductReview({ ...reviewData(r, 1), id: 1, product: { id: 1, slug: r.productSlug, title: r.productTitle } } as unknown as Review);
    expect(back).toMatchObject({ author: r.author, rating: r.rating, text: r.text, date: r.date, orderDate: r.orderDate, shipped: r.shipped, tags: r.tags });
  });
});

describe("ключи", () => {
  it("mediaFilename уникален и без слэшей", () => {
    expect(mediaFilename("/blog/zakupka/01.png")).toBe("blog-zakupka-01.png");
    expect(mediaFilename("https://zevsprotect.ru/wp-content/uploads/2026/05/a.jpg")).toBe("2026-05-a.jpg");
  });
  it("slugify", () => expect(slugify("Закупка")).toBe("zakupka"));
});
