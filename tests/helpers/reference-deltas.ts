import assert from "node:assert/strict";

export interface VerifiedDelta {
  finding: string;
  reason: string;
  before: string;
  after: string;
}
// Baseline is exactly historical. Later intentional rule fixes may add a narrow,
// independently tested source delta here; never delete/ignore state fields.
export const verifiedDeltas: readonly VerifiedDelta[] = [];
export function applyVerifiedDeltas(
  source: string,
  deltas: readonly VerifiedDelta[],
): string {
  for (const delta of deltas) {
    assert.match(delta.finding, /^F\d{2}$/);
    assert.ok(
      delta.reason.length > 10,
      "delta requires independent regression rationale",
    );
    assert.notEqual(delta.before, delta.after, "delta changes behavior");
    assert.ok(delta.before.length > 0);
    assert.equal(
      source.split(delta.before).length - 1,
      1,
      `${delta.finding}: exact unique historical target required`,
    );
    source = source.replace(delta.before, delta.after);
  }
  return source;
}
