import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("standard npm and Playwright launchers do not name OS-specific executables", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { scripts: Record<string, string> };
  assert.match(pkg.scripts.test, /^node --import tsx /);
  const config = readFileSync(
    new URL("../playwright.config.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(config, /npm\.cmd|node\.exe/);
  assert.match(config, /process\.execPath/);
});

test("npm test explicitly discovers files instead of passing a literal glob", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { scripts: Record<string, string> };
  assert.doesNotMatch(pkg.scripts.test, /\*/);
  assert.match(pkg.scripts.test, /scripts\/run-tests\.ts/);
});
