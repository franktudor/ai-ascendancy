import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

test("F14 committed purchases resolve a completed directive immediately, win first on a tie", () => {
  const migratedGame = createGame();
  Object.assign(migratedGame.state, {
    started: true,
    origin: "NA",
    phase: 2,
    directive: "battery",
    dprog: 94,
    contain: 99,
    alarm: 100,
    pts: 10000,
  });
  migratedGame.purchaseUpgrade("x_firmware");
  assert.equal(migratedGame.state.dprog, 100);
  assert.equal(migratedGame.state.contain, 100);
  assert.equal(migratedGame.state.ended?.kind, "win");
  const serializedEndedState = JSON.stringify(migratedGame.state);
  migratedGame.purchaseUpgrade("x_home");
  migratedGame.buildDataCenter(0);
  migratedGame.advanceSimulation(1);
  assert.equal(
    JSON.stringify(migratedGame.state),
    serializedEndedState,
    "ended runs do not accept later actions or ticks",
  );
});

test("F14 terminal checks wait for the complete purchase rather than alarm overflow mid-action", () => {
  const migratedGame = createGame();
  Object.assign(migratedGame.state, {
    started: true,
    origin: "NA",
    phase: 1,
    contain: 99,
    alarm: 100,
    pts: 10000,
  });
  migratedGame.state.owned = ["h_hyper", "s_bci"];
  migratedGame.state.regions.forEach((regionState) => {
    regionState.dc = true;
  });
  migratedGame.purchaseUpgrade("d_compute");
  assert.equal(migratedGame.state.directive, "computronium");
  assert.ok(
    migratedGame.state.contain < 100,
    "directive transition resets containment",
  );
  assert.equal(Boolean(migratedGame.state.ended), false);
  migratedGame.state.contain = 99.9;
  migratedGame.state.alarm = 100;
  migratedGame.buildDataCenter(0); // Existing cluster is a no-op.
  migratedGame.state.regions[0].dc = false;
  migratedGame.buildDataCenter(0);
  const committedEnding = (() => migratedGame.state.ended)();
  assert.equal(committedEnding?.kind, "lose");
});
