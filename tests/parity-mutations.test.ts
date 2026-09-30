import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  applyVerifiedDeltas,
  verifiedDeltas,
} from "./helpers/reference-deltas";

for (const [mutation, file, pattern] of [
  ["conditions", "conditions.test.ts", "callable conditions"],
  ["audit", "audits.test.ts", "generated audit"],
  ["draw", "progression.test.ts", "nine directive"],
] as const)
  test(`actual preservation suite rejects ${mutation} mutation`, () => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PARITY_MUTATION: mutation,
    };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--test",
        `--test-name-pattern=${pattern}`,
        fileURLToPath(new URL(file, import.meta.url)),
      ],
      { encoding: "utf8", env },
    );
    if (result.error) throw result.error;
    assert.notEqual(result.status, 0, "broken rule escaped the actual suite");
    assert.match(
      result.stdout + result.stderr,
      mutation === "audit" ? /makeEval mutant/ : /AssertionError/,
    );
  });

test("historical oracle deltas reject broad or stale targets", () => {
  assert.equal(
    new Set(verifiedDeltas.map((delta) => delta.finding)).size,
    verifiedDeltas.length,
    "one narrow delta per finding",
  );
  assert.throws(
    () =>
      applyVerifiedDeltas("rule; rule;", [
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
      applyVerifiedDeltas("rule;", [
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
