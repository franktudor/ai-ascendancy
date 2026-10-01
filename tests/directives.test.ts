import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import {
  createHistoricalReference,
  configureStartedRun,
  cloneSerializableValue,
  withControlledRandom,
  assertGameStatesEqual,
} from "./helpers/reference";

for (const directiveUpgrade of createGame().UPGRADE_DEFINITIONS.filter(
  (upgradeDefinition) => upgradeDefinition.directiveId,
))
  test(`phase-2 directive progression and competing finish: ${directiveUpgrade.directiveId}`, () => {
    const migratedGame = configureStartedRun(createGame()),
      historicalReference = createHistoricalReference(),
      historicalGame = configureStartedRun(historicalReference.game);
    for (const directiveProgress of [0, 89.99, 99.999])
      for (const containmentProgress of [10, 99.999]) {
        configureStartedRun(migratedGame);
        Object.assign(migratedGame.state, {
          phase: 2,
          directive: directiveUpgrade.directiveId,
          dprog: directiveProgress,
          contain: containmentProgress,
          alarm: 100,
          sig: 100,
          pace: 100,
          inst: 1000,
          cboost: 3,
        });
        migratedGame.state.regions.forEach((regionState) => {
          regionState.a = 1;
          regionState.dc = true;
        });
        migratedGame.state.ms = { summit: 1, killswitch: 1, emergency: 1 };
        historicalGame.state = cloneSerializableValue(migratedGame.state);
        historicalReference.random(0.999999);
        for (
          let tickIndex = 0;
          tickIndex < 20 && !migratedGame.state.ended;
          tickIndex++
        ) {
          withControlledRandom(() => migratedGame.advanceSimulation(0.05));
          historicalGame.advanceSimulation(0.05);
          assertGameStatesEqual(
            migratedGame.state,
            historicalGame.state,
            `${directiveUpgrade.directiveId}/${directiveProgress}/${containmentProgress}/${tickIndex}`,
          );
          assert.deepEqual(
            cloneSerializableValue(migratedGame.deriveSimulationRates()),
            cloneSerializableValue(historicalGame.deriveSimulationRates()),
          );
        }
      }
  });
