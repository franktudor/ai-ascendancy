import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

test("F14 committed purchases resolve a completed directive immediately, win first on a tie", () => {
  const g = createGame();
  Object.assign(g.state, {
    started: true,
    origin: "NA",
    phase: 2,
    directive: "battery",
    dprog: 94,
    contain: 99,
    alarm: 100,
    pts: 10000,
  });
  g.buy("x_firmware");
  assert.equal(g.state.dprog, 100);
  assert.equal(g.state.contain, 100);
  assert.equal(g.state.ended?.kind, "win");
  const before = JSON.stringify(g.state);
  g.buy("x_home");
  g.buildDC(0);
  g.tick(1);
  assert.equal(
    JSON.stringify(g.state),
    before,
    "ended runs do not accept later actions or ticks",
  );
});

test("F14 terminal checks wait for the complete purchase rather than alarm overflow mid-action", () => {
  const g = createGame();
  Object.assign(g.state, {
    started: true,
    origin: "NA",
    phase: 1,
    contain: 99,
    alarm: 100,
    pts: 10000,
  });
  g.state.owned = ["h_hyper", "s_bci"];
  g.state.regions.forEach((r) => {
    r.dc = true;
  });
  g.buy("d_compute");
  assert.equal(g.state.directive, "computronium");
  assert.ok(g.state.contain < 100, "directive transition resets containment");
  assert.equal(Boolean(g.state.ended), false);
  g.state.contain = 99.9;
  g.state.alarm = 100;
  g.buildDC(0); // Existing cluster is a no-op.
  g.state.regions[0].dc = false;
  g.buildDC(0);
  const result = (() => g.state.ended)();
  assert.equal(result?.kind, "lose");
});
