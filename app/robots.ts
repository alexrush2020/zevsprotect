import type { MetadataRoute } from "next";
import { abs } from "@/lib/seo-jsonld";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/account", "/cart", "/checkout", "/order", "/pay", "/invoice", "/login", "/register", "/forgot", "/track"],
    },
    sitemap: abs("/sitemap.xml"),
  };
}
