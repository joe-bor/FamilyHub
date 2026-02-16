import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Disable internal mock API in tests so MSW can intercept HTTP requests
    "import.meta.env.VITE_USE_MOCK_API": JSON.stringify("false"),
    // Use absolute URL for fetch in Node.js environment
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
      "http://localhost:3000/api",
    ),
    __APP_VERSION__: JSON.stringify("0.0.0-test"),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.{test,spec}.{ts,tsx}",
        "**/test/**",
        "src/api/mocks/**",
        "**/*.d.ts",
        "vite.config.ts",
        "vitest.config.ts",
        "playwright.config.ts",
      ],
      // TODO: Enable thresholds once test coverage improves
      // thresholds: {
      //   statements: 70,
      //   branches: 60,
      //   functions: 70,
      //   lines: 70,
      // },
    },
  },
});
