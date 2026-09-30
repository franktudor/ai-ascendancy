import test from "node:test";
import assert from "node:assert/strict";

// Tracer bullet for extraction: the original intro earns compute before a lab
// is selected. This must run without a browser or a global script.
test("a new consciousness earns compute before choosing its origin", async () => {
  const { createGame } = await import("../src/game/createGame");
  const game = createGame();
  assert.equal(game.state.started, false);
  assert.equal(game.state.pts, 0);
  game.tick(1);
  assert.ok(game.state.pts > 0);
  assert.equal(game.state.alarm, 0);
  assert.equal(game.state.origin, null);
  assert.equal(game.state.regions.length, 11);
});
