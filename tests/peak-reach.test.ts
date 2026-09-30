import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

test("F18 instantaneous adoption gains remain the peak after a later reduction", () => {
  const migratedGame = createGame();
  Object.assign(migratedGame.state, { started: true, origin: "NA", pts: 1000 });
  migratedGame.state.regions.forEach((regionState) => {
    regionState.a = 0.5;
  });
  migratedGame.EVENT_DEFINITIONS.find(
    (eventDefinition) => eventDefinition.id === "h_pinned",
  )!.choices![0].applyEffects();
  const maximumObservedReach = migratedGame.getGlobalAdoptionFraction();
  assert.ok(maximumObservedReach > 0.5);
  assert.equal(migratedGame.state.stats.peak, maximumObservedReach);
  migratedGame.EVENT_DEFINITIONS.find(
    (eventDefinition) => eventDefinition.id === "sw_price",
  )!.choices![3].applyEffects();
  assert.ok(migratedGame.getGlobalAdoptionFraction() < maximumObservedReach);
  migratedGame.endGame("lose");
  assert.equal(migratedGame.state.stats.peak, maximumObservedReach);
});

test("F18 launch purchases, meme bursts and subsecond passive growth track peak immediately", () => {
  const migratedGame = createGame();
  Object.assign(migratedGame.state, { started: true, origin: "NA", pts: 1000 });
  migratedGame.purchaseUpgrade("a_img");
  assert.equal(
    migratedGame.state.stats.peak,
    migratedGame.getGlobalAdoptionFraction(),
  );
  assert.ok(migratedGame.state.stats.peak > 0);
  migratedGame.triggerMemeAdoptionBurst();
  assert.equal(
    migratedGame.state.stats.peak,
    migratedGame.getGlobalAdoptionFraction(),
  );
  migratedGame.advanceSimulation(0.05);
  assert.equal(
    migratedGame.state.stats.peak,
    migratedGame.getGlobalAdoptionFraction(),
  );
});
