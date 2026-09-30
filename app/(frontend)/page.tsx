import { HomeView } from "@/components/home/home-view";
import { jsonLdScript } from "@/lib/product-jsonld";
import { organizationJsonLd } from "@/lib/seo-jsonld";
import { getArticles, getCategories, getHomeContent, getProducts } from "@/lib/server/catalog";
import { pickHomeArticles, pickHomeProducts } from "@/lib/server/content";

export const metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [content, products, categories, articles] = await Promise.all([
    getHomeContent(),
    getProducts(),
    getCategories(),
    getArticles(),
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }} />
      <HomeView
        content={content}
        categories={categories}
        featured={pickHomeProducts(products, content.featuredProducts)}
        articles={pickHomeArticles(articles, content.featuredPosts)}
      />
    </>
  );
}
