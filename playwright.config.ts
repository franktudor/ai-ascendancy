import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const port = process.env.PLAYWRIGHT_PORT ?? "5178";
const url = `http://127.0.0.1:${port}`;
const vite = fileURLToPath(
  new URL("./node_modules/vite/bin/vite.js", import.meta.url),
);
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  use: { baseURL: url, headless: true },
  webServer: {
    command: `"${process.execPath}" "${vite}" --host 127.0.0.1 --port ${port} --strictPort`,
    url,
    reuseExistingServer: !process.env.CI,
  },
});
