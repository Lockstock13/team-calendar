/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  compress: true,

  headers: async () => [
    {
      source: "/public/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/:path*",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN",
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
      ],
    },
  ],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        calendar: {
          test: /[\\/]node_modules[\\/](@fullcalendar)[\\/]/,
          name: "calendar-vendor",
          priority: 20,
          enforce: true,
          minSize: 0,
        },
        dateUtils: {
          test: /[\\/]node_modules[\\/](date-fns)[\\/]/,
          name: "date-utils",
          priority: 15,
          enforce: true,
          minSize: 0,
        },
      };
    }
    return config;
  },

  env: {
    NEXT_PUBLIC_SITE_NAME: "Still Photo Team Calendar",
  },

  swcMinify: true,
};

module.exports = nextConfig;
