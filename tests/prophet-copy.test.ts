import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

test("F17 Prophet advertises only its existing Hinton alarm mitigation", () => {
  const migratedGame = createGame();
  assert.deepEqual(migratedGame.UPGRADE_BY_ID.o_prophet.tags, [
    "Hinton warning alarm reduced",
  ]);
  for (const hasProphet of [false, true]) {
    for (const [choiceIndex, expectedAlarm] of (hasProphet
      ? [4, 3]
      : [7, 5]
    ).entries()) {
      migratedGame.state = migratedGame.createInitialState();
      migratedGame.state.pts = 200;
      migratedGame.state.flags.prophet = hasProphet;
      migratedGame.EVENT_DEFINITIONS.find(
        (eventDefinition) => eventDefinition.id === "h_hinton",
      )!.choices![choiceIndex].applyEffects();
      assert.equal(migratedGame.state.alarm, expectedAlarm);
    }
    migratedGame.state = migratedGame.createInitialState();
    migratedGame.state.flags.prophet = hasProphet;
    migratedGame.EVENT_DEFINITIONS.find(
      (eventDefinition) => eventDefinition.id === "whistle",
    )!.choices![2].applyEffects();
    assert.equal(migratedGame.state.alarm, 12);
    assert.equal(migratedGame.state.contain, 6);
  }
});
