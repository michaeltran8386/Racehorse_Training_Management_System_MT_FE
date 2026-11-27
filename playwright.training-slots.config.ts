import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "training-slots.spec.ts",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4321",
    locale: "vi-VN",
    viewport: { width: 1280, height: 900 },
    channel: process.env.PLAYWRIGHT_CHANNEL,
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js --config tests/browser/vite.config.ts --host 127.0.0.1 --port 4321 --strictPort",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
