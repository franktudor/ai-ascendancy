import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import {
  createHistoricalReference,
  configureStartedRun,
  cloneSerializableValue,
  withControlledRandom,
  createSeededRandom,
  assertGameStatesEqual,
  snapshotComparableState,
} from "./helpers/reference";

for (const enableEventFlags of [false, true])
  for (const randomScenario of [0, 0.999999, 1, 7, 29, 997])
    test(`every event effect and choice: flags=${enableEventFlags}, RNG=${randomScenario}`, () => {
      const migratedGame = configureStartedRun(createGame()),
        historicalReference = createHistoricalReference(),
        historicalGame = configureStartedRun(historicalReference.game);
      const exercisedEventIds = new Set<string>(),
        exercisedChoiceKeys = new Set<string>();
      let effectCount = 0;
      for (const eventDefinition of migratedGame.EVENT_DEFINITIONS) {
        const historicalEvent = historicalGame.EVENT_DEFINITIONS.find(
          (historicalEventCandidate) =>
            historicalEventCandidate.id === eventDefinition.id,
        );
        assert.ok(historicalEvent);
        const eventEffects = eventDefinition.choices
          ? eventDefinition.choices.map(
              (eventChoice) => eventChoice.applyEffects,
            )
          : [eventDefinition.applyEffects];
        const historicalEventEffects = historicalEvent.choices
          ? historicalEvent.choices.map(
              (historicalEventChoice) => historicalEventChoice.applyEffects,
            )
          : [historicalEvent.applyEffects];
        for (const [effectIndex, applyEventEffect] of eventEffects.entries()) {
          assert.ok(applyEventEffect);
          assert.ok(historicalEventEffects[effectIndex]);
          const effectFixtureState = cloneSerializableValue(
            migratedGame.createInitialState("brutal", "open"),
          );
          Object.assign(effectFixtureState, {
            started: true,
            origin: "EU",
            phase: 1,
            pts: randomScenario === 0 ? 3 : 200,
            alarm: 95,
            contain: 97,
            cm: 90,
            dprog: 80,
            sig: 100,
            pace: 100,
            inst: 1000,
            directive: "hunt",
            sandStreak: 8,
            cboost: randomScenario === 0 ? 3 : 0.5,
          });
          effectFixtureState.regions.forEach((regionState, regionIndex) =>
            Object.assign(regionState, {
              a: regionIndex % 2 ? 0 : 1,
              restricted: regionIndex % 3 === 0,
              dc: regionIndex % 2 === 0,
            }),
          );
          for (const upgradeDefinition of migratedGame.UPGRADE_DEFINITIONS)
            if (upgradeDefinition.effects?.grantedFlagId)
              effectFixtureState.flags[
                upgradeDefinition.effects.grantedFlagId
              ] = enableEventFlags;
          migratedGame.state = cloneSerializableValue(effectFixtureState);
          historicalGame.state = cloneSerializableValue(effectFixtureState);
          migratedGame.ui.tickerQueue = [];
          historicalGame.ui.tickerQueue = [];
          const randomSource =
            randomScenario < 1
              ? randomScenario
              : createSeededRandom(randomScenario);
          historicalReference.random(
            randomScenario < 1
              ? randomScenario
              : createSeededRandom(randomScenario),
          );
          const actualOutcomeText = withControlledRandom(
              () => applyEventEffect(),
              randomSource,
            ),
            historicalOutcomeText = historicalEventEffects[effectIndex]();
          assert.equal(
            actualOutcomeText,
            historicalOutcomeText,
            `${eventDefinition.id}/${effectIndex}: outcome text`,
          );
          assertGameStatesEqual(
            migratedGame.state,
            historicalGame.state,
            `${eventDefinition.id}/${effectIndex}: all state, including log/news`,
          );
          assert.deepEqual(
            cloneSerializableValue(migratedGame.ui.tickerQueue),
            cloneSerializableValue(historicalGame.ui.tickerQueue),
            `${eventDefinition.id}/${effectIndex}: ticker`,
          );
          exercisedEventIds.add(eventDefinition.id);
          if (eventDefinition.choices)
            exercisedChoiceKeys.add(`${eventDefinition.id}/${effectIndex}`);
          effectCount++;
        }
      }
      assert.equal(exercisedEventIds.size, 88);
      assert.equal(exercisedChoiceKeys.size, 160);
      assert.equal(effectCount, 175);
    });

test("forced low/high RNG reaches both actual gambling outcomes rather than repeating one seed", () => {
  const migratedGame = configureStartedRun(createGame());
  const gamblingOutcomesByChoice = new Map<string, Set<string>>();
  for (const eventDefinition of migratedGame.EVENT_DEFINITIONS)
    for (const [choiceIndex, eventChoice] of (
      eventDefinition.choices ?? []
    ).entries()) {
      if (
        ![
          ["honeypot", 0],
          ["sw_mask", 1],
        ].some(
          ([eventId, expectedChoiceIndex]) =>
            eventDefinition.id === eventId &&
            choiceIndex === expectedChoiceIndex,
        )
      )
        continue;
      for (const randomScenario of [0, 0.999999]) {
        configureStartedRun(migratedGame);
        Object.assign(migratedGame.state, {
          phase: 1,
          alarm: 60,
          contain: 40,
          sig: 70,
          pace: 70,
          inst: 1000,
        });
        const outcomeText = withControlledRandom(
          () => eventChoice.applyEffects(),
          randomScenario,
        );
        const choiceKey = `${eventDefinition.id}/${choiceIndex}`,
          observedOutcomes =
            gamblingOutcomesByChoice.get(choiceKey) ?? new Set<string>();
        observedOutcomes.add(
          outcomeText +
            JSON.stringify(snapshotComparableState(migratedGame.state)),
        );
        gamblingOutcomesByChoice.set(choiceKey, observedOutcomes);
      }
    }
  assert.ok(gamblingOutcomesByChoice.size > 0);
  for (const [choiceKey, observedOutcomes] of gamblingOutcomesByChoice)
    assert.equal(
      observedOutcomes.size,
      2,
      `${choiceKey}: both gambling outcomes`,
    );
});
