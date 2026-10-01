import type { GameAppElement } from "../../src/env";
import { test, expect } from "@playwright/test";

test("F19 passive compute label reflects tick income, not rewards, funding or offline recovery", async ({
  page,
}) => {
  await page.goto("/");
  const passiveComputeObservations = await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.state = migratedGame.createInitialState();
    migratedGame.state.paused = true;
    const introIncomePerSecond =
      migratedGame.deriveSimulationRates().computeIncomePerSecond;
    migratedGame.advanceSimulation(2); // Intro passive ticks are counted until a new run resets stats.
    const introPassiveCompute = migratedGame.state.earned;
    migratedGame.newRun();
    const earnedComputeAfterNewRun = migratedGame.state.earned;
    migratedGame.startRunInRegion(4); // Middle East initial funding is balance-only.
    migratedGame.closeTree();
    migratedGame.state.paused = true;
    const earnedComputeAfterOriginFunding = migratedGame.state.earned;
    const incomePerSecond =
      migratedGame.deriveSimulationRates().computeIncomePerSecond;
    migratedGame.advanceSimulation(2);
    const earnedPassiveCompute = migratedGame.state.earned;
    migratedGame.effects.adjustCompute(150);
    migratedGame.state.flags.fearsells = true;
    migratedGame.effects.adjustAlarm(10);
    migratedGame.createCapabilityAudit().choices[1].applyEffects();
    const earnedComputeAfterRewards = migratedGame.state.earned;
    const offlineSaveState = migratedGame.createInitialState();
    Object.assign(offlineSaveState, {
      started: true,
      origin: "NA",
      savedAt: Date.now() - 60000,
      earned: earnedPassiveCompute,
    });
    migratedGame.resumeRun(offlineSaveState);
    migratedGame.state.paused = true;
    const earnedComputeAfterOfflineRecovery = migratedGame.state.earned;
    migratedGame.endGame("lose");
    return {
      intro: introPassiveCompute,
      introExpected: introIncomePerSecond * 2,
      reset: earnedComputeAfterNewRun,
      funding: earnedComputeAfterOriginFunding,
      passive: earnedPassiveCompute,
      expected: incomePerSecond * 2,
      rewards: earnedComputeAfterRewards,
      offline: earnedComputeAfterOfflineRecovery,
      label: document.querySelector("#endStats")!.textContent,
    };
  });
  expect(passiveComputeObservations.intro).toBe(
    passiveComputeObservations.introExpected,
  );
  expect(passiveComputeObservations.reset).toBe(0);
  expect(passiveComputeObservations.funding).toBe(0);
  expect(passiveComputeObservations.passive).toBe(
    passiveComputeObservations.expected,
  );
  expect(passiveComputeObservations.rewards).toBe(
    passiveComputeObservations.passive,
  );
  expect(passiveComputeObservations.offline).toBe(
    passiveComputeObservations.passive,
  );
  expect(passiveComputeObservations.label).toContain("Passive compute earned");
});
