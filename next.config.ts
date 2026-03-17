import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enable React compiler for better performance
    reactCompiler: false,
  },
  // Disable x-powered-by header for security
  poweredByHeader: false,
  // Enable strict mode
  reactStrictMode: true,
  // Image domains if needed
  images: {
    remotePatterns: [],
  },
  // Headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
