// next.config.mjs
import { execSync } from "child_process";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

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
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "definicion.de" },
      { protocol: "https", hostname: "demo.themesberg.com" },
      { protocol: "https", hostname: "entradamaster.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "mdueqvcazdypzlepvxoc.supabase.co" },
      { protocol: "https", hostname: "lqshkfaxmljadbdfbrnp.supabase.co" },
    ],
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  webpack(config, { dev, isServer }) {
    if (!dev && isServer) {
      console.log("🛠️ Running `prisma generate` before build...");
      execSync("npx prisma generate", { stdio: "inherit" });
    }
    return config;
  },
};

export default withPWA(config);
