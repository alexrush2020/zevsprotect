import { describe, expect, it } from "vitest";
import { articleJsonLd, breadcrumbJsonLd, organizationJsonLd } from "./seo-jsonld";

describe("seo-jsonld", () => {
  it("BreadcrumbList: позиции с 1, абсолютные URL", () => {
    const ld = breadcrumbJsonLd([["Каталог", "/catalog"], ["Товар", "/product/x"]]);
    expect(ld.itemListElement.map((i) => [i.position, i.item])).toEqual([
      [1, "https://zevsprotect.ru/catalog"],
      [2, "https://zevsprotect.ru/product/x"],
    ]);
  });
  it("Article: dateModified по умолчанию = дата публикации, картинка абсолютная", () => {
    const ld = articleJsonLd({ slug: "a", title: "T", excerpt: "E", date: "2026-01-02", image: "/m/a.jpg" });
    expect(ld).toMatchObject({ "@type": "Article", dateModified: "2026-01-02", image: ["https://zevsprotect.ru/m/a.jpg"], mainEntityOfPage: "https://zevsprotect.ru/blog/a" });
  });
  it("Organization + WebSite в одном графе", () => {
    expect(organizationJsonLd()["@graph"].map((n) => n["@type"])).toEqual(["Organization", "WebSite"]);
  });
});
