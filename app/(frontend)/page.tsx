import { HomeView } from "@/components/home/home-view";
import { jsonLdScript } from "@/lib/product-jsonld";
import { organizationJsonLd } from "@/lib/seo-jsonld";

export const metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }} />
      <HomeView />
    </>
  );
}
