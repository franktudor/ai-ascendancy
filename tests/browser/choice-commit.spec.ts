import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import type { GameState } from "../../src/game/types";

test("Continue commits an event reward exactly once to state, history and persistence", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.state.started = true;
    migratedGame.state.origin = "NA";
    migratedGame.state.paused = true;
    migratedGame.state.pts = 20;
    migratedGame.state.log = [];
    migratedGame.ui.screenMode = "play";
    migratedGame.saveRun();
    migratedGame.showEvent({
      kind: "OPPORTUNITY",
      title: "Reward contract",
      body: "A known reward.",
      choices: [
        {
          label: "Earn five",
          hint: "Compute +5",
          applyEffects: () => migratedGame.effects.adjustCompute(5),
        },
      ],
    });
  });
  await page.locator("#evChoices button").click();
  await expect(page.locator("#evOutcome")).toContainText("Compute +5");
  const readCommitState = () =>
    page.evaluate(() => {
      const migratedGame =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      return {
        pts: migratedGame.state.pts,
        log: migratedGame.state.log,
        saved: JSON.parse(
          localStorage.getItem(migratedGame.saveStorageKey)!,
        ) as GameState,
      };
    });
  const previewState = await readCommitState();
  expect(previewState.pts).toBe(20);
  expect(previewState.log).toEqual([]);
  expect(previewState.saved.pts).toBe(20);
  expect(previewState.saved.log).toEqual([]);
  await page.locator("#evBack").click();
  await page.locator("#evChoices button").click();
  await page.locator("#evContinue").click();
  await expect(page.locator("#eventModal")).toBeHidden();
  const committedState = await readCommitState();
  expect(committedState.pts).toBe(25);
  expect(committedState.log).toHaveLength(1);
  expect(committedState.log[0]).toMatchObject({
    title: "Reward contract",
    out: "Compute +5",
  });
  expect(committedState.saved.pts).toBe(25);
  expect(committedState.saved.log).toEqual(committedState.log);
  // A queued duplicate click may reach the old handler after the dialog closes.
  await page.locator("#evContinue").evaluate((continueButton) => {
    if (continueButton instanceof HTMLButtonElement) continueButton.click();
  });
  const repeatedCommitState = await readCommitState();
  expect(repeatedCommitState.pts).toBe(committedState.pts);
  expect(repeatedCommitState.log).toEqual(committedState.log);
  expect(repeatedCommitState.saved.pts).toBe(committedState.saved.pts);
  expect(repeatedCommitState.saved.log).toEqual(committedState.saved.log);
});
