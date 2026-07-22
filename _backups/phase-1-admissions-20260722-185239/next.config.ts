/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/sermons",
        destination: "/news-events",
        permanent: true,
      },
      {
        source: "/giving",
        destination: "/admissions",
        permanent: true,
      },
      {
        source: "/wraps",
        destination: "/gallery",
        permanent: true,
      },
      {
        source: "/churches/:path*",
        destination: "/campus-life",
        permanent: true,
      },
      {
        source: "/groups/:path*",
        destination: "/campus-life",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
