import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
