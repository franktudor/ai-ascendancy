import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

test("F18 instantaneous adoption gains remain the peak after a later reduction", () => {
  const g = createGame();
  Object.assign(g.state, { started: true, origin: "NA", pts: 1000 });
  g.state.regions.forEach((r) => {
    r.a = 0.5;
  });
  g.EVENTS.find((e) => e.id === "h_pinned")!.choices![0].fx();
  const peak = g.reach();
  assert.ok(peak > 0.5);
  assert.equal(g.state.stats.peak, peak);
  g.EVENTS.find((e) => e.id === "sw_price")!.choices![3].fx();
  assert.ok(g.reach() < peak);
  g.endGame("lose");
  assert.equal(g.state.stats.peak, peak);
});

test("F18 launch purchases, meme bursts and subsecond passive growth track peak immediately", () => {
  const g = createGame();
  Object.assign(g.state, { started: true, origin: "NA", pts: 1000 });
  g.buy("a_img");
  assert.equal(g.state.stats.peak, g.reach());
  assert.ok(g.state.stats.peak > 0);
  g.burst();
  assert.equal(g.state.stats.peak, g.reach());
  g.tick(0.05);
  assert.equal(g.state.stats.peak, g.reach());
});
