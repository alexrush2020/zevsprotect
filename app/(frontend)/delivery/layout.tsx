import { pageMeta } from "@/lib/seo-jsonld";

export const metadata = pageMeta("Доставка", "Сравнение стоимости доставки СДЭК, Деловыми линиями, ПЭК и «Энергией», самовывоз из Таганрога.", "/delivery");

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
