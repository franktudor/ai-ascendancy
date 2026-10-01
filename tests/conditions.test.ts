import test from "node:test";
import assert from "node:assert/strict";
import { createParityTestGame as createGame } from "./helpers/subject";
import type {
  ArchitectureId,
  DifficultyId,
  FlagId,
  ForkId,
  GameState,
} from "../src/game/types";
import {
  createHistoricalReference,
  createSeededRandom,
  cloneSerializableValue,
} from "./helpers/reference";

const architectureIds = ["assistant", "swarm", "researcher", "open"] as const;
const difficultyIds = ["casual", "standard", "brutal"] as const;
function generateConditionTestStates(
  migratedGame: ReturnType<typeof createGame>,
  architectureId: ArchitectureId,
  difficultyId: DifficultyId,
): GameState[] {
  const seededRandom = createSeededRandom(811);
  const flagIds = [
    ...new Set<FlagId>([
      ...migratedGame.UPGRADE_DEFINITIONS.flatMap((upgradeDefinition) =>
        upgradeDefinition.effects?.grantedFlagId
          ? [upgradeDefinition.effects.grantedFlagId]
          : [],
      ),
      "computeCap",
      "nuke",
      "slot",
      "slop",
    ]),
  ];
  return Array.from({ length: 150 }, (_unusedEntry, sampleIndex) => {
    const conditionFixtureState = cloneSerializableValue(
      migratedGame.createInitialState(difficultyId, architectureId),
    );
    Object.assign(conditionFixtureState, {
      started: true,
      origin: migratedGame.REGION_DEFINITIONS[sampleIndex % 11].id,
      phase: sampleIndex % 3,
      pts: seededRandom() * 10000,
      alarm: Math.floor(seededRandom() * 101),
      contain: seededRandom() * 100,
      dprog: seededRandom() * 100,
      inst: seededRandom() * 1500,
      sig: seededRandom() * 100,
      pace: seededRandom() * 100,
      directive: migratedGame.UPGRADE_DEFINITIONS.filter(
        (upgradeDefinition) => upgradeDefinition.directiveId,
      )[sampleIndex % 9].directiveId,
    });
    conditionFixtureState.owned = migratedGame.UPGRADE_DEFINITIONS.filter(
      () => seededRandom() < 0.5,
    ).map((upgradeDefinition) => upgradeDefinition.id);
    for (const flagId of flagIds)
      conditionFixtureState.flags[flagId] =
        sampleIndex < 6 ? sampleIndex % 2 === 1 : seededRandom() < 0.5;
    for (const regionState of conditionFixtureState.regions)
      Object.assign(regionState, {
        a: sampleIndex < 6 ? sampleIndex % 2 : seededRandom(),
        allied: seededRandom() < 0.2,
        restricted: seededRandom() < 0.5,
        dc: seededRandom() < 0.6,
        struck: seededRandom() < 0.3,
      });
    for (const forkId of [
      "core",
      "memory",
      "mask",
      "escape",
      "directive",
    ] satisfies ForkId[]) {
      const forkUpgradeOptions = migratedGame.UPGRADE_DEFINITIONS.filter(
        (upgradeDefinition) => upgradeDefinition.fork === forkId,
      );
      if (seededRandom() < 0.5)
        conditionFixtureState.forks[forkId] =
          forkUpgradeOptions[
            Math.floor(seededRandom() * forkUpgradeOptions.length)
          ].id;
    }
    conditionFixtureState.stats.evalSpoof = Math.floor(seededRandom() * 12);
    conditionFixtureState.stats.evalCaught = Math.floor(seededRandom() * 6);
    return conditionFixtureState;
  });
}
for (const architectureId of architectureIds)
  for (const difficultyId of difficultyIds)
    test(`callable conditions and purchase gates: ${architectureId}/${difficultyId}`, () => {
      const migratedGame = createGame(),
        historicalGame = createHistoricalReference().game;
      const observedConditionOutcomes = new Map<string, Set<boolean>>();
      const compareConditionResult = (
        conditionKey: string,
        actualConditionResult: boolean | undefined,
        historicalConditionResult: boolean | undefined,
      ) => {
        assert.equal(
          actualConditionResult,
          historicalConditionResult,
          conditionKey,
        );
        if (historicalConditionResult !== undefined) {
          const observedOutcomes =
            observedConditionOutcomes.get(conditionKey) ?? new Set<boolean>();
          observedOutcomes.add(!!historicalConditionResult);
          observedConditionOutcomes.set(conditionKey, observedOutcomes);
        }
      };
      for (const conditionFixtureState of generateConditionTestStates(
        migratedGame,
        architectureId,
        difficultyId,
      )) {
        migratedGame.state = cloneSerializableValue(conditionFixtureState);
        historicalGame.state = cloneSerializableValue(conditionFixtureState);
        for (const upgradeDefinition of migratedGame.UPGRADE_DEFINITIONS) {
          const historicalUpgrade =
            historicalGame.UPGRADE_BY_ID[upgradeDefinition.id];
          if (upgradeDefinition.isAvailable || historicalUpgrade.isAvailable)
            compareConditionResult(
              `upgrade:${upgradeDefinition.id}`,
              upgradeDefinition.isAvailable?.(migratedGame.state),
              historicalUpgrade.isAvailable?.(historicalGame.state),
            );
          for (const upgradeQueryMethod of [
            "getUpgradeCost",
            "getUpgradeStatus",
            "getUpgradeLockReason",
          ] as const)
            assert.equal(
              migratedGame[upgradeQueryMethod](upgradeDefinition),
              historicalGame[upgradeQueryMethod](historicalUpgrade),
              `${upgradeQueryMethod}:${upgradeDefinition.id}`,
            );
        }
        for (const eventDefinition of migratedGame.EVENT_DEFINITIONS) {
          const historicalEvent = historicalGame.EVENT_DEFINITIONS.find(
            (historicalEventCandidate) =>
              historicalEventCandidate.id === eventDefinition.id,
          );
          assert.ok(historicalEvent);
          if (eventDefinition.isEligible || historicalEvent.isEligible)
            compareConditionResult(
              `event:${eventDefinition.id}`,
              eventDefinition.isEligible?.(migratedGame.state),
              historicalEvent.isEligible?.(historicalGame.state),
            );
          eventDefinition.choices?.forEach((eventChoice, choiceIndex) => {
            const historicalChoice = historicalEvent.choices?.[choiceIndex];
            assert.ok(historicalChoice);
            if (eventChoice.isAvailable || historicalChoice.isAvailable)
              compareConditionResult(
                `choice:${eventDefinition.id}/${choiceIndex}`,
                eventChoice.isAvailable?.(migratedGame.state),
                historicalChoice.isAvailable?.(historicalGame.state),
              );
          });
        }
      }
      assert.equal(
        observedConditionOutcomes.size,
        101,
        "9 upgrade + 77 event + 15 choice callables",
      );
      // Some conditions are constants or deliberately impossible for a random state;
      // do not claim exhaustive branch coverage of this finite sampled matrix.
      assert.ok(
        [...observedConditionOutcomes.values()].filter(
          (observedOutcomes) => observedOutcomes.size === 2,
        ).length >= 90,
        "both truth outcomes for at least 90 callables",
      );
    });
