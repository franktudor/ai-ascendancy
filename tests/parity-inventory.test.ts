import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import { createHistoricalReference } from "./helpers/reference";

test("coverage inventory names every upgrade/event/choice/directive/ending in the oracle", (testContext) => {
  const migratedGame = createGame(),
    historicalGame = createHistoricalReference().game;
  const coverageInventory = {
    upgrades: migratedGame.UPGRADE_DEFINITIONS.map(
      (upgradeDefinition) => upgradeDefinition.id,
    ),
    events: migratedGame.EVENT_DEFINITIONS.map(
      (eventDefinition) => eventDefinition.id,
    ),
    choices: migratedGame.EVENT_DEFINITIONS.flatMap((eventDefinition) =>
      (eventDefinition.choices ?? []).map(
        (_unusedEntry, choiceIndex) => `${eventDefinition.id}/${choiceIndex}`,
      ),
    ),
    directives: migratedGame.UPGRADE_DEFINITIONS.flatMap((upgradeDefinition) =>
      upgradeDefinition.directiveId ? [upgradeDefinition.directiveId] : [],
    ),
    endings: Object.keys(migratedGame.ENDING_DEFINITIONS),
  };
  for (const [inventoryCategory, expectedCount] of [
    ["upgrades", 90],
    ["events", 88],
    ["choices", 160],
    ["directives", 9],
    ["endings", 16],
  ] as const) {
    assert.equal(
      coverageInventory[inventoryCategory].length,
      expectedCount,
      inventoryCategory,
    );
    assert.equal(
      new Set(coverageInventory[inventoryCategory]).size,
      expectedCount,
      inventoryCategory,
    );
  }
  assert.deepEqual(
    coverageInventory.upgrades,
    Array.from(
      historicalGame.UPGRADE_DEFINITIONS,
      (upgradeDefinition) => upgradeDefinition.id,
    ),
  );
  assert.deepEqual(
    coverageInventory.events,
    Array.from(
      historicalGame.EVENT_DEFINITIONS,
      (eventDefinition) => eventDefinition.id,
    ),
  );
  assert.deepEqual(
    coverageInventory.choices,
    Array.from(historicalGame.EVENT_DEFINITIONS, (eventDefinition) =>
      Array.from(
        eventDefinition.choices ?? [],
        (_unusedEntry, choiceIndex) => `${eventDefinition.id}/${choiceIndex}`,
      ),
    ).flat(),
  );
  testContext.diagnostic(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(coverageInventory).map(
          ([inventoryCategory, coveredIds]) => [
            inventoryCategory,
            coveredIds.length,
          ],
        ),
      ),
    ),
  );
});
