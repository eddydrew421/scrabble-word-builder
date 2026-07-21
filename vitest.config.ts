import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000, // the real-dictionary suite loads 168k words once
    coverage: { provider: "v8", include: ["src/**"], reporter: ["text", "lcov"] },
  },
});