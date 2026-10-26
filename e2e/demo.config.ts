import base from "./playwright.config";
import { defineConfig } from "@playwright/test";

// Records the demo video: npx playwright test --config demo.config.ts
export default defineConfig({ ...base, testDir: "./demo", timeout: 900_000 });
