import type { MetadataRoute } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { abs } from "@/lib/seo-jsonld";

// Читаем БД на запросе: sitemap не должен зависеть от доступности БД при сборке.
export const dynamic = "force-dynamic";

const staticPaths = ["/", "/catalog", "/blog", "/about", "/delivery", "/contacts", "/price", "/samples", "/calculation", "/privacy"];

/**
 * Категории каталога отдельных URL не имеют (/catalog?category=… — фильтр на одной странице),
 * поэтому в sitemap только товары и статьи; опубликованные — access коллекций (overrideAccess:false).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config });
  const list = async (collection: "products" | "posts") =>
    (await payload.find({ collection, overrideAccess: false, pagination: false, depth: 0, select: { slug: true, updatedAt: true } })).docs;
  const [products, posts] = await Promise.all([list("products"), list("posts")]);
  return [
    ...staticPaths.map((p) => ({ url: abs(p) })),
    ...products.map((d) => ({ url: abs(`/product/${d.slug}`), lastModified: d.updatedAt })),
    ...posts.map((d) => ({ url: abs(`/blog/${d.slug}`), lastModified: d.updatedAt })),
  ];
}
