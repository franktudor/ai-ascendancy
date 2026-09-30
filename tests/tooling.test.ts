import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("npm test explicitly discovers files instead of passing a literal glob", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { scripts: Record<string, string> };
  assert.doesNotMatch(pkg.scripts.test, /\*/);
  assert.match(pkg.scripts.test, /scripts\/run-tests\.ts/);
});
