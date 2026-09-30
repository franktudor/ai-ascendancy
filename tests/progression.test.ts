import test from "node:test";
import assert from "node:assert/strict";
import { createParityTestGame as createGame } from "./helpers/subject";
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
    for (const phaseId of [0, 1, 2] as const)
      test(`active simulation trace: ${architectureId}/${difficultyId}/phase${phaseId}`, () => {
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
        Object.assign(migratedGame.state, {
          phase: phaseId,
          pts: 1000,
          alarm: phaseId === 0 ? 20 : 55,
          contain: 10,
          nextEv: 2,
          nextEval: 3,
          sig: 30,
          pace: 30,
          inst: 1000,
        });
        migratedGame.state.flags.launched = true;
        migratedGame.state.seen.honeypot =
          migratedGame.state.seen.copyright =
          migratedGame.state.seen.hearing =
            1;
        if (phaseId === 0)
          for (const eventDefinition of migratedGame.EVENT_DEFINITIONS)
            if (eventDefinition.choices)
              migratedGame.state.seen[eventDefinition.id] = 1;
        if (phaseId >= 1) {
          migratedGame.state.owned = [
            "a_img",
            "s_inf",
            "s_dense",
            "s_persist",
            "s_tool",
            "s_dist",
          ];
          Object.assign(migratedGame.state.flags, {
            dense: true,
            persist: true,
            tools: true,
            distributed: true,
          });
        }
        if (phaseId === 2) migratedGame.state.directive = "upload";
        migratedGame.state.regions.forEach((regionState, regionIndex) => {
          regionState.a = phaseId === 0 ? 0.03 : 0.5;
          regionState.dc = regionIndex < 3;
        });
        historicalGame.state = cloneSerializableValue(migratedGame.state);
        const seededRandom = createSeededRandom(431);
        historicalReference.random(createSeededRandom(431));
        let tickCount = 0,
          auditCount = 0;
        for (
          let tickIndex = 0;
          tickIndex < 600 && !migratedGame.state.ended;
          tickIndex++
        ) {
          for (const queuedDecision of cloneSerializableValue(
            migratedGame.state.brief.dec,
          )) {
            if (queuedDecision.t === "eval") {
              const actualAudit = withControlledRandom(
                  () => migratedGame.createCapabilityAudit(),
                  seededRandom,
                ),
                historicalAudit = historicalGame.createCapabilityAudit();
              assert.equal(actualAudit.title, historicalAudit.title);
              withControlledRandom(
                () => actualAudit.choices[0].applyEffects(),
                seededRandom,
              );
              historicalAudit.choices[0].applyEffects();
              auditCount++;
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
              const choiceIndex = actualEvent.choices.findIndex(
                (eventChoice) =>
                  !eventChoice.isAvailable ||
                  eventChoice.isAvailable(migratedGame.state),
              );
              assert.ok(choiceIndex >= 0);
              assert.equal(
                withControlledRandom(
                  () => actualEvent.choices[choiceIndex].applyEffects(),
                  seededRandom,
                ),
                historicalEvent.choices[choiceIndex].applyEffects(),
              );
            }
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
            `tick ${tickIndex}: including log, news and decisions`,
          );
          assert.deepEqual(
            cloneSerializableValue(migratedGame.deriveSimulationRates()),
            cloneSerializableValue(historicalGame.deriveSimulationRates()),
          );
        }
        assert.ok(tickCount > 100);
        assert.ok(migratedGame.state.stats.events > 0);
        assert.ok(migratedGame.state.log.length > 0);
        assert.ok(migratedGame.state.brief.news.length > 0);
        if (phaseId === 1)
          assert.ok(auditCount > 0, "actual audit scheduler exercised");
      });

test("every upgrade purchase executes its original effects and phase/directive transition", () => {
  const migratedGame = configureStartedRun(createGame()),
    historicalReference = createHistoricalReference(),
    historicalGame = configureStartedRun(historicalReference.game);
  const purchasedUpgradeIds = new Set<UpgradeId>();
  for (const upgradeDefinition of migratedGame.UPGRADE_DEFINITIONS)
    for (const randomValue of [0, 0.999999]) {
      configureStartedRun(migratedGame);
      Object.assign(migratedGame.state, {
        phase: upgradeDefinition.phase ?? 0,
        directive:
          upgradeDefinition.phase === 2
            ? (upgradeDefinition.requiredActiveDirectiveId ?? "upload")
            : null,
        pts: 1e9,
        inst: 1000,
        sig: 100,
        alarm: upgradeDefinition.id === "d_hunt" ? 95 : 55,
      });
      migratedGame.state.stats.evalSpoof = 6;
      migratedGame.state.regions.forEach((regionState) => {
        regionState.a = 0.95;
        regionState.dc = true;
      });
      migratedGame.state.owned = migratedGame.UPGRADE_DEFINITIONS.filter(
        (otherUpgrade) =>
          otherUpgrade.id !== upgradeDefinition.id &&
          (!upgradeDefinition.fork ||
            otherUpgrade.fork !== upgradeDefinition.fork) &&
          !otherUpgrade.directiveId &&
          otherUpgrade.phase !== 2,
      ).map((otherUpgrade) => otherUpgrade.id);
      for (const upgradeId of migratedGame.state.owned) {
        const flagId =
          migratedGame.UPGRADE_BY_ID[upgradeId].effects?.grantedFlagId;
        if (flagId) migratedGame.state.flags[flagId] = true;
      }
      migratedGame.state.forks = {};
      historicalGame.state = cloneSerializableValue(migratedGame.state);
      historicalReference.random(randomValue);
      assert.equal(
        migratedGame.getUpgradeStatus(upgradeDefinition),
        historicalGame.getUpgradeStatus(
          historicalGame.UPGRADE_BY_ID[upgradeDefinition.id],
        ),
        upgradeDefinition.id,
      );
      assert.equal(
        migratedGame.getUpgradeStatus(upgradeDefinition),
        "afford",
        `fixture makes ${upgradeDefinition.id} reachable`,
      );
      // Headless createGame retains bulletin news even for actions (documented
      // headless port policy). Invoke the original unwrapped action with no
      // browser acting flag so both preserve these messages for exact comparison.
      withControlledRandom(
        () => migratedGame.purchaseUpgrade(upgradeDefinition.id),
        randomValue,
      );
      historicalGame.purchaseUpgrade(upgradeDefinition.id);
      assertGameStatesEqual(
        migratedGame.state,
        historicalGame.state,
        upgradeDefinition.id,
      );
      purchasedUpgradeIds.add(upgradeDefinition.id);
    }
  assert.equal(purchasedUpgradeIds.size, 90);
});

test("nine directive draw mappings and all sixteen endings use the historical oracle", () => {
  const migratedGame = configureStartedRun(createGame()),
    historicalReference = createHistoricalReference(),
    historicalGame = configureStartedRun(historicalReference.game);
  assert.deepEqual(
    cloneSerializableValue(migratedGame.DRAW_ENDING_BY_DIRECTIVE),
    cloneSerializableValue(historicalGame.DRAW_ENDING_BY_DIRECTIVE),
  );
  const directiveUpgrades = migratedGame.UPGRADE_DEFINITIONS.filter(
      (upgradeDefinition) => upgradeDefinition.directiveId,
    ),
    observedEndingKeys = new Set<string>();
  assert.equal(directiveUpgrades.length, 9);
  for (const upgradeDefinition of directiveUpgrades)
    for (const directiveProgress of [89.9999, 90, 99.99, 100])
      for (const endingKind of ["win", "lose"] as const) {
        configureStartedRun(migratedGame);
        Object.assign(migratedGame.state, {
          phase: 2,
          directive: upgradeDefinition.directiveId,
          dprog: directiveProgress,
        });
        historicalGame.state = cloneSerializableValue(migratedGame.state);
        migratedGame.endGame(endingKind);
        historicalGame.endGame(endingKind);
        assertGameStatesEqual(
          migratedGame.state,
          historicalGame.state,
          `${upgradeDefinition.directiveId}/${directiveProgress}/${endingKind}`,
        );
        observedEndingKeys.add(migratedGame.state.ended!.key);
      }
  for (const phaseId of [0, 1, 2] as const) {
    configureStartedRun(migratedGame);
    migratedGame.state.phase = phaseId;
    historicalGame.state = cloneSerializableValue(migratedGame.state);
    migratedGame.endGame("lose");
    historicalGame.endGame("lose");
    assertGameStatesEqual(
      migratedGame.state,
      historicalGame.state,
      `loss phase ${phaseId}`,
    );
    observedEndingKeys.add(migratedGame.state.ended!.key);
  }
  assert.equal(observedEndingKeys.size, 16);
});
