import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("standard npm and Playwright launchers do not name OS-specific executables", () => {
  const packageManifest = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { scripts: Record<string, string> };
  assert.match(packageManifest.scripts.test, /^node --import tsx /);
  const playwrightConfigSource = readFileSync(
    new URL("../playwright.config.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(playwrightConfigSource, /npm\.cmd|node\.exe/);
  assert.match(playwrightConfigSource, /process\.execPath/);
});

test("npm test explicitly discovers files instead of passing a literal glob", () => {
  const packageManifest = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { scripts: Record<string, string> };
  assert.doesNotMatch(packageManifest.scripts.test, /\*/);
  assert.match(packageManifest.scripts.test, /scripts\/run-tests\.ts/);
});
