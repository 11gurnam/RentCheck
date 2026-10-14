import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({ ...base, testDir: "./tests/operations", fullyParallel: false, workers: 1, outputDir: "./work/operations-results", reporter: [["list"], ["html", { open: "never", outputFolder: "work/operations-report" }]] });
