import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  applyVerifiedHistoricalDeltas,
  verifiedDeltas,
} from "./helpers/reference-deltas";

for (const [mutationId, suiteFilename, testNamePattern] of [
  ["conditions", "conditions.test.ts", "callable conditions"],
  ["audit", "audits.test.ts", "generated audit"],
  ["draw", "progression.test.ts", "nine directive"],
] as const)
  test(`actual preservation suite rejects ${mutationId} mutation`, () => {
    const testEnvironment: NodeJS.ProcessEnv = {
      ...process.env,
      PARITY_MUTATION: mutationId,
    };
    delete testEnvironment.NODE_TEST_CONTEXT;
    const mutationTestResult = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--test",
        `--test-name-pattern=${testNamePattern}`,
        fileURLToPath(new URL(suiteFilename, import.meta.url)),
      ],
      { encoding: "utf8", env: testEnvironment },
    );
    if (mutationTestResult.error) throw mutationTestResult.error;
    assert.notEqual(
      mutationTestResult.status,
      0,
      "broken rule escaped the actual suite",
    );
    assert.match(
      mutationTestResult.stdout + mutationTestResult.stderr,
      new RegExp(testNamePattern),
      "the selected target suite actually ran",
    );
    assert.doesNotMatch(
      mutationTestResult.stdout + mutationTestResult.stderr,
      /tests 0(?:\s|$)/,
      "a zero-test subprocess is not mutation evidence",
    );
    assert.match(
      mutationTestResult.stdout + mutationTestResult.stderr,
      mutationId === "audit" ? /makeEval mutant/ : /AssertionError/,
    );
  });

test("historical oracle deltas reject broad or stale targets", () => {
  assert.equal(
    new Set(verifiedDeltas.map((historicalDelta) => historicalDelta.before))
      .size,
    verifiedDeltas.length,
    "each independently justified historical location has a distinct exact target",
  );
  assert.throws(
    () =>
      applyVerifiedHistoricalDeltas("rule; rule;", [
        {
          finding: "F15",
          reason: "independently verified fixture",
          before: "rule;",
          after: "fixed;",
        },
      ]),
    /unique/,
  );
  assert.throws(
    () =>
      applyVerifiedHistoricalDeltas("rule;", [
        {
          finding: "F15",
          reason: "independently verified fixture",
          before: "absent",
          after: "fixed;",
        },
      ]),
    /unique/,
  );
});
