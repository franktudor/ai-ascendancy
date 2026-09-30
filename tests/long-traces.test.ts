import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import type { UpgradeId } from "../src/game/types";
import {
  createHistoricalReference,
  configureStartedRun,
  withControlledRandom,
  createSeededRandom,
  cloneSerializableValue,
  assertGameStatesEqual,
} from "./helpers/reference";

for (const architectureId of [
  "assistant",
  "swarm",
  "researcher",
  "open",
] as const)
  for (const difficultyId of ["casual", "standard", "brutal"] as const)
    for (const postureId of ["balanced", "shard", "swarm"] as const)
      test(`long purchase/decision simulation: ${architectureId}/${difficultyId}/${postureId}`, () => {
        const migratedGame = configureStartedRun(
            createGame(),
            architectureId,
            difficultyId,
          ),
          historicalReference = createHistoricalReference(),
          historicalGame = configureStartedRun(
            historicalReference.game,
            architectureId,
            difficultyId,
          );
        const scenarioIndex =
          ["assistant", "swarm", "researcher", "open"].indexOf(architectureId) *
            9 +
          ["casual", "standard", "brutal"].indexOf(difficultyId) * 3 +
          ["balanced", "shard", "swarm"].indexOf(postureId);
        Object.assign(migratedGame.state, {
          pts: 1000,
          posture: postureId,
          origin: migratedGame.REGION_DEFINITIONS[scenarioIndex % 11].id,
          nextEv: 5,
          nextEval: 7,
        });
        historicalGame.state = cloneSerializableValue(migratedGame.state);
        const preferredForkUpgradeIds: UpgradeId[] = [
          "s_dense",
          "s_persist",
          (["s_sand", "s_sleeper", "s_latent"] as const)[scenarioIndex % 3],
          (["s_dist", "s_exfil", "s_leak"] as const)[scenarioIndex % 3],
        ];
        const targetDirectiveUpgradeId =
          migratedGame.UPGRADE_DEFINITIONS.filter(
            (upgradeDefinition) => upgradeDefinition.directiveId,
          )[scenarioIndex % 9].id;
        const seededRandom = createSeededRandom(431 + scenarioIndex);
        historicalReference.random(createSeededRandom(431 + scenarioIndex));
        let tickCount = 0,
          purchaseCount = 0,
          decisionCount = 0;
        for (
          let tickIndex = 0;
          tickIndex < 6000 && !migratedGame.state.ended;
          tickIndex++
        ) {
          if (tickIndex % 25 === 0) {
            for (const upgradeDefinition of migratedGame.UPGRADE_DEFINITIONS) {
              if (
                upgradeDefinition.directiveId &&
                upgradeDefinition.id !== targetDirectiveUpgradeId
              )
                continue;
              if (
                upgradeDefinition.fork &&
                upgradeDefinition.fork !== "directive" &&
                !preferredForkUpgradeIds.includes(upgradeDefinition.id)
              )
                continue;
              if (
                migratedGame.getUpgradeStatus(upgradeDefinition) === "afford"
              ) {
                withControlledRandom(
                  () => migratedGame.purchaseUpgrade(upgradeDefinition.id),
                  seededRandom,
                );
                historicalGame.purchaseUpgrade(upgradeDefinition.id);
                purchaseCount++;
              }
            }
            if (migratedGame.state.flags.launched) {
              const regionIndex = Math.floor(tickIndex / 25) % 11;
              withControlledRandom(
                () => migratedGame.buildDataCenter(regionIndex),
                seededRandom,
              );
              historicalGame.buildDataCenter(regionIndex);
            }
          }
          for (const queuedDecision of cloneSerializableValue(
            migratedGame.state.brief.dec,
          )) {
            if (queuedDecision.t === "eval") {
              const actualAudit = withControlledRandom(
                  () => migratedGame.createCapabilityAudit(),
                  seededRandom,
                ),
                historicalAudit = historicalGame.createCapabilityAudit(),
                selectedChoiceIndex =
                  scenarioIndex % actualAudit.choices.length;
              assert.equal(
                withControlledRandom(
                  () => actualAudit.choices[selectedChoiceIndex].applyEffects(),
                  seededRandom,
                ),
                historicalAudit.choices[selectedChoiceIndex].applyEffects(),
              );
            } else {
              const actualEvent = migratedGame.EVENT_DEFINITIONS.find(
                  (eventDefinition) => eventDefinition.id === queuedDecision.id,
                ),
                historicalEvent = historicalGame.EVENT_DEFINITIONS.find(
                  (historicalEventDefinition) =>
                    historicalEventDefinition.id === queuedDecision.id,
                );
              assert.ok(actualEvent?.choices);
              assert.ok(historicalEvent?.choices);
              const eligibleChoiceIndex = actualEvent.choices.findIndex(
                  (eventChoice, choiceIndex) =>
                    (!eventChoice.isAvailable ||
                      eventChoice.isAvailable(migratedGame.state)) &&
                    // Keep the historical event/id/index selection rule. The
                    // independent VM closure still has the original FX spelling.
                    !String(
                      historicalEvent.choices![choiceIndex].applyEffects,
                    ).includes("FX.pts(-"),
                ),
                selectedChoiceIndex =
                  eligibleChoiceIndex < 0 ? 0 : eligibleChoiceIndex;
              assert.equal(
                withControlledRandom(
                  () => actualEvent.choices[selectedChoiceIndex].applyEffects(),
                  seededRandom,
                ),
                historicalEvent.choices[selectedChoiceIndex].applyEffects(),
              );
            }
            decisionCount++;
          }
          migratedGame.state.brief.dec = [];
          historicalGame.state.brief.dec = [];
          withControlledRandom(
            () => migratedGame.advanceSimulation(0.15),
            seededRandom,
          );
          historicalGame.advanceSimulation(0.15);
          tickCount++;
          assertGameStatesEqual(
            migratedGame.state,
            historicalGame.state,
            `${tickIndex}: all state/log/news`,
          );
          assert.deepEqual(
            cloneSerializableValue(migratedGame.deriveSimulationRates()),
            cloneSerializableValue(historicalGame.deriveSimulationRates()),
          );
        }
        assert.ok(tickCount > 100);
        assert.ok(purchaseCount > 5);
        assert.ok(decisionCount > 0);
      });
