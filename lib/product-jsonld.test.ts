import { describe, expect, it } from "vitest";
import { products } from "@/lib/data/catalog";
import { jsonLdScript, productJsonLd } from "./product-jsonld";

describe("productJsonLd", () => {
  const [p] = products;

  it("offers: цена карточки в RUB, наличие по остатку; картинки абсолютные", () => {
    const ld = productJsonLd({ ...p, stock: 10 }, ["/api/media/file/a.jpg", "https://cdn.x/b.jpg"], { average: 0, count: 0 });
    expect(ld.offers).toMatchObject({ price: p.price, priceCurrency: "RUB", availability: "https://schema.org/InStock" });
    expect(ld.offers.url).toBe(`https://zevsprotect.ru/product/${p.slug}`);
    expect(ld.image).toEqual(["https://zevsprotect.ru/api/media/file/a.jpg", "https://cdn.x/b.jpg"]);
    expect([ld.name, ld.sku, ld.brand.name]).toEqual([p.name, p.sku, "zevsprotect®"]);
    expect(ld).not.toHaveProperty("aggregateRating");
  });

  it("нет остатка — PreOrder; рейтинг только при отзывах", () => {
    const ld = productJsonLd({ ...p, stock: 0 }, [], { average: 4.5, count: 2 });
    expect(ld.offers.availability).toBe("https://schema.org/PreOrder");
    expect(ld).toMatchObject({ aggregateRating: { ratingValue: 4.5, reviewCount: 2 } });
  });

  it("jsonLdScript не даёт закрыть <script> текстом из CMS", () => {
    expect(jsonLdScript({ d: "</script><b>" })).not.toContain("<");
  });
});
