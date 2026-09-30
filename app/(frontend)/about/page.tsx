import { AboutView } from "@/components/about/about-view";
import { pageMeta } from "@/lib/seo-jsonld";

export const metadata = pageMeta("О компании", "Производство защитных перчаток в Таганроге: цех, контроль качества, поставки по России, Беларуси и Казахстану.", "/about");

export default function AboutPage() {
  return <AboutView />;
}
