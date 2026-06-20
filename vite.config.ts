// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        filename: "sw.js",
        strategies: "generateSW",
        injectRegister: null,
        registerType: "autoUpdate",
        manifest: false,
        devOptions: { enabled: false },
        workbox: {
          cleanupOutdatedCaches: true,
          navigateFallbackDenylist: [/^\/\~oauth/],
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff2}"],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: { cacheName: "gcs-pages", networkTimeoutSeconds: 4 },
            },
            {
              urlPattern: ({ sameOrigin, url }) => sameOrigin && /\/assets\/.*\.[a-f0-9]{8,}\./.test(url.pathname),
              handler: "CacheFirst",
              options: { cacheName: "gcs-assets" },
            },
          ],
        },
      }),
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    },
    // Add this block to override the default Cloudflare target for Vercel
    nitro: {
      preset: "vercel",
  },
});
