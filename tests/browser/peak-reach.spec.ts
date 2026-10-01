import type { GameAppElement } from "../../src/env";
import { test, expect } from "@playwright/test";

test("F18 preview never leaks peak; each committed adoption gain records it", async ({
  page,
}) => {
  await page.goto("/");
  const previewWasIsolated = await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    Object.assign(migratedGame.state, {
      started: true,
      origin: "NA",
      pts: 1000,
      paused: true,
    });
    migratedGame.ui.screenMode = "play";
    migratedGame.state.regions.forEach((regionState) => {
      regionState.a = 0.5;
    });
    const adoptionEvent = migratedGame.EVENT_DEFINITIONS.find(
      (adoptionEvent) => adoptionEvent.id === "h_pinned",
    )!;
    const adoptionChoice = adoptionEvent.choices![0];
    const liveState = migratedGame.state,
      serializedStateBeforePreview = JSON.stringify(liveState);
    migratedGame.previewEventChoice(adoptionChoice);
    const previewIsolated =
      liveState === migratedGame.state &&
      serializedStateBeforePreview === JSON.stringify(migratedGame.state);
    migratedGame.showEvent({ ...adoptionEvent, choices: [adoptionChoice] });
    return previewIsolated;
  });
  expect(previewWasIsolated).toBe(true);
  await page.locator("#evChoices button").click();
  await page.locator("#evContinue").click();
  expect(
    await page.evaluate(() => {
      const migratedGame =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      const maximumObservedReach = migratedGame.getGlobalAdoptionFraction();
      migratedGame.EVENT_DEFINITIONS.find(
        (eventDefinition) => eventDefinition.id === "sw_price",
      )!.choices![3].applyEffects();
      return (
        migratedGame.state.stats.peak === maximumObservedReach &&
        migratedGame.getGlobalAdoptionFraction() < maximumObservedReach
      );
    }),
  ).toBe(true);
});
