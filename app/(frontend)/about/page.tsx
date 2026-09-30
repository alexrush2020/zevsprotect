import { AboutView } from "@/components/about/about-view";
import { pageMeta } from "@/lib/seo-jsonld";
import { getAboutContent, getCategories, getHomeContent } from "@/lib/server/catalog";

export const metadata = pageMeta("О компании", "Производство защитных перчаток в Таганроге: цех, контроль качества, поставки по России, Беларуси и Казахстану.", "/about");

export default async function AboutPage() {
  const [content, categories, home] = await Promise.all([getAboutContent(), getCategories(), getHomeContent()]);
  // отзывы — те же, что на доске главной (глобал home)
  return <AboutView content={content} categories={categories} reviews={home.reviews} />;
}
