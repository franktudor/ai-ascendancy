import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = readdirSync(join(root, "tests"), { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".test.ts"))
  .sort()
  .map((file) => join(root, "tests", file));
if (files.length === 0) throw new Error("No headless test files discovered");
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...process.argv.slice(2), ...files], {
  cwd: root,
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
