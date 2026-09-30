import { brand } from "@/lib/brand";
import { pageMeta } from "@/lib/seo-jsonld";

export const metadata = pageMeta("Контакты", `${brand.legal}, ${brand.address}. Телефон ${brand.phone}, ${brand.email}.`, "/contacts");

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
