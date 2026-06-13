import { readFileSync } from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const { version } = JSON.parse(readFileSync("package.json", "utf-8"));

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "icons/*.png"],
        manifest: {
          name: "FamilyHub",
          short_name: "FamilyHub",
          description:
            "Your family's command center for calendar, lists, chores, and meals.",
          id: "/",
          scope: "/",
          start_url: "/",
          display: "standalone",
          orientation: "any",
          background_color: "#faf8f5",
          theme_color: "#faf8f5",
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/icons/icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          // Never precache the bundle-analysis report (only present with ANALYZE=true).
          globIgnores: ["**/stats.html"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api/],
          // No runtimeCaching: Nunito is self-hosted via @fontsource/nunito and
          // precached by the glob above; the old Google Fonts CDN rules were dead.
        },
      }),
      // Bundle analysis is opt-in (ANALYZE=true) and written outside dist/ so it
      // is never deployed or swept into the service-worker precache.
      ...(process.env.ANALYZE === "true"
        ? [
            visualizer({
              filename: ".analyze/stats.html",
              open: false,
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom"],
            "query-vendor": ["@tanstack/react-query"],
            "date-vendor": ["date-fns", "react-day-picker"],
            "radix-vendor": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-popover",
              "@radix-ui/react-scroll-area",
              "@radix-ui/react-tabs",
              "@radix-ui/react-slot",
              "@radix-ui/react-label",
            ],
          },
        },
      },
    },
  };
});
