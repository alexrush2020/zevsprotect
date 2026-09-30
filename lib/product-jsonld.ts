import { brand } from "@/lib/brand";
import { catalogPrice } from "@/lib/lots";
import type { Product } from "@/lib/types";

const origin = `https://${brand.domain}`;
export const absolute = (src: string) => (/^https?:\/\//.test(src) ? src : `${origin}${src.startsWith("/") ? "" : "/"}${src}`);

/** JSON-LD schema.org/Product для карточки товара. Цена — та же, что в карточке и корзине (catalogPrice). */
export function productJsonLd(
  product: Product,
  images: string[],
  rating: { average: number; count: number },
) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.description,
    image: images.map(absolute),
    brand: { "@type": "Brand", name: brand.mark },
    offers: {
      "@type": "Offer",
      price: catalogPrice(product),
      priceCurrency: "RUB",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
      url: `${origin}/product/${product.slug}`,
    },
    ...(rating.count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average, reviewCount: rating.count } }
      : {}),
  };
}

/** Для <script type="application/ld+json">: `<` экранируется, чтобы текст из CMS не закрыл тег. */
export const jsonLdScript = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
