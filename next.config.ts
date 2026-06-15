import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Next.js 16 uses Turbopack by default. Adding an empty turbopack config
  // silences the "webpack config but no turbopack config" build error caused
  // by the @serwist/next plugin injecting a webpack config internally.
  turbopack: {},
};

export default withSerwist(nextConfig);
