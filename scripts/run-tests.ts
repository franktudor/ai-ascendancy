import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const headlessTestPaths = readdirSync(join(repositoryRoot, "tests"), {
  recursive: true,
  encoding: "utf8",
})
  .filter((testFilePath) => testFilePath.endsWith(".test.ts"))
  .sort()
  .map((testFilePath) => join(repositoryRoot, "tests", testFilePath));
if (headlessTestPaths.length === 0)
  throw new Error("No headless test files discovered");
const testProcessResult = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...process.argv.slice(2), ...headlessTestPaths],
  {
    cwd: repositoryRoot,
    stdio: "inherit",
  },
);
if (testProcessResult.error) throw testProcessResult.error;
process.exitCode = testProcessResult.status ?? 1;
