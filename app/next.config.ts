import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "http2.mlstatic.com",
      },
      {
        protocol: "https",
        hostname: "*.mlstatic.com",
      },
    ],
  },
  // Evitar warnings de Supabase en edge runtime
  serverExternalPackages: ["@supabase/supabase-js"],
};

export default nextConfig;
