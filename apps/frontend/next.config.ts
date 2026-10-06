import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  output: "standalone",
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
