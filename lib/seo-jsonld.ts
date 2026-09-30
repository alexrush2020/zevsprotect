import { brand } from "@/lib/brand";

// Канонический origin — всегда боевой домен (как в product-jsonld), а не NEXT_PUBLIC_SERVER_URL: в dev это localhost.
export const siteOrigin = `https://${brand.domain}`;
export const abs = (path: string) => (/^https?:\/\//.test(path) ? path : `${siteOrigin}${path.startsWith("/") ? "" : "/"}${path}`);

/** Organization + WebSite для главной. Только реквизиты из lib/brand. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteOrigin}/#organization`,
        name: brand.mark,
        legalName: brand.legal,
        url: siteOrigin,
        email: brand.email,
        telephone: brand.phone,
        taxID: brand.inn,
        address: { "@type": "PostalAddress", streetAddress: "Поляковское шоссе, 17", addressLocality: "Таганрог", addressCountry: "RU" },
      },
      { "@type": "WebSite", "@id": `${siteOrigin}/#website`, url: siteOrigin, name: brand.mark, inLanguage: "ru", publisher: { "@id": `${siteOrigin}/#organization` } },
    ],
  };
}

/** BreadcrumbList: элементы — [название, путь]; последний — текущая страница. */
export function breadcrumbJsonLd(items: [name: string, path: string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
  };
}

/** Metadata страницы: title/description/canonical + OG (openGraph в Next не наследуется по полям, поэтому задаём целиком). */
export function pageMeta(title: string, description: string, path: string, image?: string) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: brand.mark, locale: "ru_RU", type: "website" as const, ...(image ? { images: [abs(image)] } : {}) },
  };
}

export function articleJsonLd(a: { slug: string; title: string; excerpt: string; date: string; updatedAt?: string; image?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt,
    datePublished: a.date,
    dateModified: a.updatedAt ?? a.date,
    mainEntityOfPage: abs(`/blog/${a.slug}`),
    ...(a.image ? { image: [abs(a.image)] } : {}),
    author: { "@type": "Organization", name: brand.mark },
    publisher: { "@type": "Organization", name: brand.mark, url: siteOrigin },
  };
}
