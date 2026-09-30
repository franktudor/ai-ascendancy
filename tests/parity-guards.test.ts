import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("preservation suites execute callable conditions, audits, and independent draw mappings", () => {
  for (const [file, marker] of [
    ["conditions.test.ts", ".cond?.("],
    ["audits.test.ts", "makeEval("],
    ["progression.test.ts", "reference"],
    ["dispatch.test.ts", "fireEvent("],
    ["branches.test.ts", "choices"],
  ] as const) {
    let text = "";
    try {
      text = readFileSync(new URL(file, import.meta.url), "utf8");
    } catch {
      /* Missing suite is the regression. */
    }
    assert.ok(text.includes(marker), `${file} executable coverage missing`);
  }
});
