import type { Metadata } from "next";
import { Inter, Unbounded } from "next/font/google";
import { brand, brandTitle } from "@/lib/brand";
import { siteOrigin } from "@/lib/seo-jsonld";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getClientCatalog } from "@/lib/server/catalog";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

const unbounded = Unbounded({
  variable: "--font-heading",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: brandTitle,
    template: `%s · ${brand.mark}`,
  },
  description: `${brand.markRu} — ${brand.tagline.toLowerCase()}. Собственное производство защитных перчаток в Таганроге. Каталог, опт, доставка по России.`,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const catalog = await getClientCatalog();
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${inter.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers catalog={catalog}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
