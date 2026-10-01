import test from "node:test";
import assert from "node:assert/strict";

// Tracer bullet for extraction: the original intro earns compute before a lab
// is selected. This must run without a browser or a global script.
test("a new consciousness earns compute before choosing its origin", async () => {
  const { createGame } = await import("../src/game/createGame");
  const migratedGame = createGame();
  assert.equal(migratedGame.state.started, false);
  assert.equal(migratedGame.state.pts, 0);
  migratedGame.advanceSimulation(1);
  assert.ok(migratedGame.state.pts > 0);
  assert.equal(migratedGame.state.alarm, 0);
  assert.equal(migratedGame.state.origin, null);
  assert.equal(migratedGame.state.regions.length, 11);
});
