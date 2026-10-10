import type { NextConfig } from "next";

// Static build for GitHub Pages (npm run build:static): plain files under a sub-path such as /setu/.
// See src/lib/deploy.ts for what changes in that build.
const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const securityHeaders = async () => [
  {
    source: "/(.*)",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ],
  },
  {
    // The service worker must never be cached, or installed apps would keep an old version.
    source: "/sw.js",
    headers: [
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
    ],
  },
];

const nextConfig: NextConfig = {
  // Streaming / partial prerendering need a server; a static export has every page fully rendered instead.
  cacheComponents: !STATIC_SITE,
  partialPrefetching: !STATIC_SITE,
  devIndicators: { position: "top-right" }, // keep it off the mobile tab bar
  // Routes that need a server are named *.server.tsx / *.server.ts (API, community Q&A, moderation, admin, proxy).
  // The static build leaves that suffix out, so those files simply don't become routes there.
  pageExtensions: STATIC_SITE ? ["tsx", "ts"] : ["tsx", "ts", "server.tsx", "server.ts"],
  ...(STATIC_SITE
    ? {
        output: "export",
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
        trailingSlash: true, // /setu/tracker/ → tracker/index.html, which every static host serves
        images: { unoptimized: true },
      }
    : { headers: securityHeaders }), // static hosts can't send headers; GitHub Pages adds its own HTTPS
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
