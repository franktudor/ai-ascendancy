import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

test("F15 learned honeypot insight cannot impersonate Extended Context ownership", () => {
  const migratedGame = createGame();
  Object.assign(migratedGame.state, { started: true, origin: "NA", pts: 1000 });
  migratedGame.purchaseUpgrade("s_inf");
  migratedGame.purchaseUpgrade("s_persist");
  const learnInsightChoice = migratedGame.EVENT_DEFINITIONS.find(
    (eventDefinition) => eventDefinition.id === "h_glitch",
  )!.choices![1];
  learnInsightChoice.applyEffects();
  assert.equal(migratedGame.state.flags.insight, true);
  assert.equal(
    migratedGame.getUpgradeStatus(migratedGame.UPGRADE_BY_ID.s_ctx),
    "closed",
  );
  const contextOnlyChoice = migratedGame.EVENT_DEFINITIONS.find(
    (eventDefinition) => eventDefinition.id === "sw_memory",
  )!.choices!.find(
    (eventChoice) => eventChoice.requirementText === "Extended Context",
  )!;
  assert.equal(
    Boolean(contextOnlyChoice.isAvailable!(migratedGame.state)),
    false,
  );
  assert.ok(
    migratedGame.EVENT_DEFINITIONS.find(
      (eventDefinition) => eventDefinition.id === "honeypot",
    )!.choices!.some((eventChoice) =>
      eventChoice.isAvailable?.(migratedGame.state),
    ),
    "insight still grants honeypot tactic",
  );
  const contextOnlyChoices = migratedGame.EVENT_DEFINITIONS.flatMap(
    (eventDefinition) => eventDefinition.choices ?? [],
  ).filter(
    (eventChoice) =>
      eventChoice.requirementText === "Extended Context" &&
      eventChoice.label !== "Recognize the trap",
  );
  assert.equal(contextOnlyChoices.length, 2);
  assert.ok(
    contextOnlyChoices.every(
      (eventChoice) => !eventChoice.isAvailable!(migratedGame.state),
    ),
  );
  assert.equal(
    migratedGame.EVENT_DEFINITIONS.find(
      (eventDefinition) => eventDefinition.id === "honeypot",
    )!.choices![1].requirementText,
    "Insight",
  );
  migratedGame.state = migratedGame.createInitialState();
  Object.assign(migratedGame.state, { started: true, origin: "NA", pts: 1000 });
  migratedGame.purchaseUpgrade("s_inf");
  migratedGame.purchaseUpgrade("s_ctx");
  assert.equal(
    Boolean(contextOnlyChoice.isAvailable!(migratedGame.state)),
    true,
  );
  migratedGame.state.flags.insight = false;
  assert.equal(
    Boolean(contextOnlyChoice.isAvailable!(migratedGame.state)),
    true,
    "ownership, not the shared insight flag, is authoritative",
  );
});
