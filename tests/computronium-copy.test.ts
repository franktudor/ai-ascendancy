import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

test("F16 Computronium copy communicates the retained Neural Interface Standard prerequisite", () => {
  const g = createGame();
  const u = g.UP.d_compute;
  assert.match(u.desc, /Neural Interface Standard/);
  assert.doesNotMatch(u.desc, /no headsets|only needs the hardware/i);
  assert.deepEqual(u.req, ["h_hyper", "s_bci"]);
  Object.assign(g.state, {
    started: true,
    origin: "NA",
    phase: 1,
    pts: 10000,
    owned: ["h_hyper"],
  });
  g.state.regions.slice(0, 7).forEach((r) => {
    r.dc = true;
  });
  assert.equal(g.status(u), "locked");
  assert.equal(g.lockReason(u), "Requires Neural Interface Standard");
  g.state.owned.push("s_bci");
  assert.equal(g.status(u), "afford");
  g.buy(u.id);
  assert.equal(g.state.directive, "computronium");
});
