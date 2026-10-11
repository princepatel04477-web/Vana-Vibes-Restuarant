import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      // Older table QR standees encoded /cafe/<slug>?table=..&token=.. (no /menu).
      // Query params pass through, so those printed QRs still open the ordering menu.
      {
        source: "/cafe/:cafeId",
        destination: "/cafe/:cafeId/menu",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
