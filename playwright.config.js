import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:8080",
    viewport: { width: 1440, height: 1080 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "python3 -m http.server 8080 --bind 127.0.0.1",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: !process.env.CI,
  },
});
