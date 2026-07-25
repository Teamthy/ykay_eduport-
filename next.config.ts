import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },

  // ── Security headers applied to every response ──────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.paystack.co https://*.upstash.io https://*.neon.tech",
              "frame-src 'self' https://checkout.paystack.com",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // ── TypeScript — ignore build errors (types checked separately via tsc) ──
  typescript: {
    ignoreBuildErrors: true,
  },

  // ── Power the X-Powered-By header ──────────────────────────
  poweredByHeader: false,

  // ── Performance optimizations for 1K DAU ──────────────────
  compress: true,

  // Experimental features for better performance
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ["lucide-react", "@radix-ui/react-dialog", "framer-motion"],
  },
};

export default nextConfig;
