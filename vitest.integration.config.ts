import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    // Real-evidence fixtures temporarily change the shared local intake mode.
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
