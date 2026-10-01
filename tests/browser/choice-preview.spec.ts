import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";

test("Continue reuses the gamble preview instead of sampling twice", async ({
  page,
}) => {
  await page.goto("/");
  const computeBeforePreview = await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    Object.assign(migratedGame.state, {
      started: true,
      origin: "NA",
      paused: true,
    });
    migratedGame.ui.screenMode = "play";
    let effectCallCount = 0;
    migratedGame.showEvent({
      kind: "INCIDENT",
      title: "Cached chance",
      body: "One real roll.",
      choices: [
        {
          label: "Roll",
          hint: "Compute +5",
          applyEffects: () => {
            effectCallCount++;
            Math.random();
            return migratedGame.effects.adjustCompute(5);
          },
        },
      ],
    });
    // Expose only a counter for the regression, not a new game API.
    document.querySelector<HTMLElement>("#evTitle")!.dataset.calls =
      String(effectCallCount);
    const previewOriginalEventChoice = migratedGame.previewEventChoice;
    migratedGame.previewEventChoice = (eventChoice) => {
      const choicePreview = previewOriginalEventChoice(eventChoice);
      document.querySelector<HTMLElement>("#evTitle")!.dataset.calls =
        String(effectCallCount);
      return choicePreview;
    };
    const appendOriginalRunLog = migratedGame.appendRunLog;
    migratedGame.appendRunLog = (...logArguments) => {
      appendOriginalRunLog(...logArguments);
      document.querySelector<HTMLElement>("#evTitle")!.dataset.calls =
        String(effectCallCount);
    };
    return migratedGame.state.pts;
  });
  await page.locator("#evChoices button").click();
  await expect(page.locator("#evTitle")).toHaveAttribute("data-calls", "200");
  await page.locator("#evContinue").click();
  await expect(page.locator("#evTitle")).toHaveAttribute("data-calls", "201");
  expect(
    await page.evaluate(
      () =>
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.state.pts,
    ),
  ).toBe(computeBeforePreview + 5);
  await page.locator("#evContinue").click();
  await expect(page.locator("#eventModal")).toBeHidden();
});
