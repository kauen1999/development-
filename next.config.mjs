/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  swcMinify: true,
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
      },
      {
        protocol: "https",
        hostname: "definicion.de",
      },
      {
        protocol: "https",
        hostname: "demo.themesberg.com",
      },
      {
        protocol: "https",
        hostname: "entradamaster.com",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },

      {
        protocol: "https",
        hostname: "rtbugxvtjadkeuyncdpp.supabase.co",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
