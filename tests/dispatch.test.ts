import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import {
  createHistoricalReference,
  configureStartedRun,
  withControlledRandom,
  createSeededRandom,
  cloneSerializableValue,
  assertGameStatesEqual,
} from "./helpers/reference";

for (const decisionQueueFull of [false, true])
  for (const randomSeed of [1, 7, 42, 991])
    test(`weighted dispatcher, eligibility and decision cap: full=${decisionQueueFull}, seed=${randomSeed}`, () => {
      const migratedGame = configureStartedRun(createGame()),
        historicalReference = createHistoricalReference(),
        historicalGame = configureStartedRun(historicalReference.game);
      migratedGame.state.owned = migratedGame.UPGRADE_DEFINITIONS.filter(
        (upgradeDefinition) =>
          !upgradeDefinition.directiveId && upgradeDefinition.phase !== 2,
      ).map((upgradeDefinition) => upgradeDefinition.id);
      for (const upgradeDefinition of migratedGame.UPGRADE_DEFINITIONS)
        if (upgradeDefinition.effects?.grantedFlagId)
          migratedGame.state.flags[upgradeDefinition.effects.grantedFlagId] =
            true;
      Object.assign(migratedGame.state, { phase: 1, alarm: 80, t: 500 });
      migratedGame.state.regions.forEach((regionState) => {
        regionState.a = 0.9;
        regionState.dc = true;
      });
      if (decisionQueueFull)
        migratedGame.state.brief.dec = [
          { t: "eval" },
          { t: "ev", id: "copyright" },
        ];
      historicalGame.state = cloneSerializableValue(migratedGame.state);
      const seededRandom = createSeededRandom(randomSeed);
      historicalReference.random(createSeededRandom(randomSeed));
      for (let dispatchIndex = 0; dispatchIndex < 100; dispatchIndex++) {
        withControlledRandom(
          () => migratedGame.triggerRandomEvent(),
          seededRandom,
        );
        historicalGame.triggerRandomEvent();
        assertGameStatesEqual(
          migratedGame.state,
          historicalGame.state,
          `dispatch ${dispatchIndex}: seen, decisions, effects, log/news`,
        );
        assert.deepEqual(
          cloneSerializableValue(migratedGame.ui.tickerQueue),
          cloneSerializableValue(historicalGame.ui.tickerQueue),
        );
        if (decisionQueueFull)
          assert.equal(migratedGame.state.brief.dec.length, 2);
        else {
          migratedGame.state.brief.dec = [];
          historicalGame.state.brief.dec = [];
        }
      }
      assert.ok(
        migratedGame.state.stats.events > 0,
        `dispatcher delivered ${migratedGame.state.stats.events} events`,
      );
      assert.ok(migratedGame.state.log.length > 0);
      assert.ok(migratedGame.state.brief.news.length > 0);
    });

test("every direct event dispatch is once-only and chained descendants are actually delivered", () => {
  const migratedGame = configureStartedRun(createGame()),
    historicalReference = createHistoricalReference(),
    historicalGame = configureStartedRun(historicalReference.game);
  for (const eventDefinition of migratedGame.EVENT_DEFINITIONS) {
    configureStartedRun(migratedGame);
    configureStartedRun(historicalGame);
    historicalReference.random(0.999999);
    withControlledRandom(() =>
      migratedGame.triggerEventById(eventDefinition.id),
    );
    historicalGame.triggerEventById(eventDefinition.id);
    assertGameStatesEqual(
      migratedGame.state,
      historicalGame.state,
      eventDefinition.id,
    );
    const stateAfterFirstDispatch = cloneSerializableValue(migratedGame.state);
    migratedGame.triggerEventById(eventDefinition.id);
    historicalGame.triggerEventById(eventDefinition.id);
    assert.deepEqual(
      cloneSerializableValue(migratedGame.state),
      stateAfterFirstDispatch,
      `${eventDefinition.id}: duplicate dispatch`,
    );
  }
  for (const chainRootId of [
    "h_lensa",
    "h_song",
    "h_board",
    "h_robocall",
    "h_openclaw",
    "h_collective",
  ] as const) {
    configureStartedRun(migratedGame);
    configureStartedRun(historicalGame);
    migratedGame.state.flags.tools = migratedGame.state.flags.launched = true;
    historicalGame.state = cloneSerializableValue(migratedGame.state);
    const chainRootEvent = migratedGame.EVENT_DEFINITIONS.find(
        (eventDefinition) => eventDefinition.id === chainRootId,
      ),
      historicalChainRoot = historicalGame.EVENT_DEFINITIONS.find(
        (historicalEventDefinition) =>
          historicalEventDefinition.id === chainRootId,
      );
    assert.ok(chainRootEvent);
    assert.ok(historicalChainRoot);
    withControlledRandom(() =>
      chainRootEvent.choices
        ? chainRootEvent.choices[0].applyEffects()
        : chainRootEvent.applyEffects(),
    );
    historicalChainRoot.choices
      ? historicalChainRoot.choices[0].applyEffects()
      : historicalChainRoot.applyEffects();
    const deliveredDescendantIds = new Set<string>();
    for (
      let chainDeliveryIteration = 0;
      migratedGame.state.queue.length;
      chainDeliveryIteration++
    ) {
      assert.ok(chainDeliveryIteration < 20, "chain terminates");
      migratedGame.state.t = historicalGame.state.t = Math.min(
        ...migratedGame.state.queue.map((scheduledEvent) => scheduledEvent.at),
      );
      for (const comparisonGame of [migratedGame, historicalGame])
        for (
          let queueIndex = comparisonGame.state.queue.length - 1;
          queueIndex >= 0;
          queueIndex--
        ) {
          if (
            comparisonGame.state.queue[queueIndex].at <= comparisonGame.state.t
          ) {
            const scheduledDescendant = comparisonGame.state.queue.splice(
              queueIndex,
              1,
            )[0];
            deliveredDescendantIds.add(scheduledDescendant.id);
            withControlledRandom(() =>
              comparisonGame.triggerEventById(scheduledDescendant.id),
            );
          }
        }
      assertGameStatesEqual(
        migratedGame.state,
        historicalGame.state,
        chainRootId + ": chain delivery",
      );
    }
    assert.ok(deliveredDescendantIds.size > 0, chainRootId);
  }
});
