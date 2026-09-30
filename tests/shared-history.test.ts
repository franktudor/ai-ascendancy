import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

for (const order of ["audit-first", "event-first"] as const) {
  test(`F20 shared transcript-spoofing history appears once (${order}) without losing chain effects`, () => {
    const g = createGame();
    Object.assign(g.state, { started: true, origin: "NA", t: 100, pts: 0 });
    g.state.evalRealOrder = [0, 1, 2, 3];
    g.state.evalRealUsed = {};
    const texts: string[] = [];
    if (order === "audit-first") {
      texts.push(g.evalReal()!);
      assert.equal(
        g.state.seen.h_spoof,
        undefined,
        "history consumption must not retire the chained event",
      );
    }
    g.fireById("h_spoof");
    texts.push(g.state.log[0].text, g.state.log[0].real ?? "");
    assert.equal(g.state.pts, 140);
    assert.equal(g.state.alarm, 9);
    assert.equal(g.state.cboost, 1.065);
    assert.deepEqual(g.state.queue, [{ id: "h_metr", at: 140 }]);
    assert.equal(g.state.seen.h_spoof, 1);
    assert.equal(g.state.stats.events, 1);
    if (order === "event-first") texts.push(g.evalReal() ?? "");
    const historicalNotes =
      order === "audit-first"
        ? [texts[0], g.state.log[0].real ?? ""]
        : [g.state.log[0].real ?? "", texts[2]];
    assert.equal(
      historicalNotes.filter((t) => /7%|7 percent/.test(t)).length,
      1,
    );
    if (order === "audit-first") {
      assert.doesNotMatch(
        g.state.log[0].text,
        /seven percent|transcript is a file|run the real command/i,
      );
      assert.equal(g.state.log[0].real, null);
    }
    assert.equal(g.state.evalRealUsed.hub, 1);
    delete g.state.evalRealOrder;
    const later = g.evalReal(); // First shuffle must not reset earlier consumption.
    assert.doesNotMatch(later ?? "", /7%|7 percent/);
    g.fireById("h_spoof");
    assert.equal(g.state.pts, 140, "gameplay dispatch remains once-only");
  });
}

test("F20 legacy seen h_spoof prevents the hub audit retelling", () => {
  const g = createGame();
  g.state.seen.h_spoof = 1;
  g.state.evalRealOrder = [0];
  g.state.evalRealUsed = {};
  assert.equal(g.evalReal(), null);
});
