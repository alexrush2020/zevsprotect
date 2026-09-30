import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import { redirects } from "./lib/redirects";

const nextConfig: NextConfig = {
  // прод-образ Docker (deploy/, docs/DEPLOY.md): server.js + трассированные node_modules; withPayload учитывает трассировку
  output: "standalone",
  redirects: async () => redirects,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zevsprotect.ru",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
