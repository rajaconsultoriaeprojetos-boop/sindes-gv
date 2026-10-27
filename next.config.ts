import type { NextConfig } from "next";

const semCache = [{ key: "Cache-Control", value: "no-store" }];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  cacheComponents: true,
  experimental: {
    proxyClientMaxBodySize: "12mb",
  },
  async headers() {
    const rotas = [
      "/admin",
      "/admin/:path*",
      "/assessoria",
      "/assessoria/:path*",
      "/calculadora",
      "/portal",
      "/voucher/:path*",
      "/atendimento",
      "/atendimento/:path*",
      "/api/admin/:path*",
      "/api/assessoria/:path*",
      "/api/atendimentos",
      "/api/atendimentos/:path*",
      "/api/voucher/:path*",
      "/api/analisar-trct",
      "/api/trct",
      "/api/convenios/pedidos",
    ];
    return rotas.map((source) => ({ source, headers: semCache }));
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
