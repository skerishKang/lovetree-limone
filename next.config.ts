import type { NextConfig } from "next";

const LINEAGE_52_INERT_SOURCE =
  "/design-lab-assets/lineages/52/v3/lovetree-52-v3-reference-earth-orbit.txt";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: LINEAGE_52_INERT_SOURCE,
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "default-src 'none'; sandbox" },
        ],
      },
    ];
  },
};

export default nextConfig;
