import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "process.env.NEXT_PUBLIC_API_BASE_URL": JSON.stringify(
      "http://localhost:8080/api/v1",
    ),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    clearMocks: true,
  },
});
