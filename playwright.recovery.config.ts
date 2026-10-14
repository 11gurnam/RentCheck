import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testDir: "./tests/recovery",
  fullyParallel: false,
  workers: 1,
  outputDir: "./work/recovery-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "work/recovery-report" }],
  ],
});
