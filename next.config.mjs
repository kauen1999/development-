//next.config.mjs
/** @type {import('next').NextConfig} */
import { execSync } from 'child_process';

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
        hostname: "mdueqvcazdypzlepvxoc.supabase.co",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Webpack hook to run Prisma Client generation before Next.js build
  webpack(config, { dev, isServer }) {
    if (!dev && isServer) {
      console.log("🛠️ Running `prisma generate` before build...");
      execSync("npx prisma generate", { stdio: "inherit" });
    }
    return config;
  },
};

export default config;
