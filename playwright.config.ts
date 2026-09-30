import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const webServerPort = process.env.PLAYWRIGHT_PORT ?? "5178";
const baseUrl = `http://127.0.0.1:${webServerPort}`;
const viteEntryPath = fileURLToPath(
  new URL("./node_modules/vite/bin/vite.js", import.meta.url),
);
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  use: { baseURL: baseUrl, headless: true },
  webServer: {
    command: `"${process.execPath}" "${viteEntryPath}" --host 127.0.0.1 --port ${webServerPort} --strictPort`,
    url: baseUrl,
    reuseExistingServer: !process.env.CI,
  },
});
