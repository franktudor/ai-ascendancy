import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("preservation suites execute callable conditions, audits, and independent draw mappings", () => {
  for (const [suiteFilename, coverageMarker] of [
    ["conditions.test.ts", ".isAvailable?.("],
    ["audits.test.ts", "createCapabilityAudit("],
    ["progression.test.ts", "reference"],
    ["dispatch.test.ts", "triggerRandomEvent("],
    ["branches.test.ts", "choices"],
  ] as const) {
    let suiteSourceText = "";
    try {
      suiteSourceText = readFileSync(
        new URL(suiteFilename, import.meta.url),
        "utf8",
      );
    } catch {
      /* Missing suite is the regression. */
    }
    assert.ok(
      suiteSourceText.includes(coverageMarker),
      `${suiteFilename} executable coverage missing`,
    );
  }
});
