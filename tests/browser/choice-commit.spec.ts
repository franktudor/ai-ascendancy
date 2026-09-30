import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import type { GameState } from "../../src/game/types";

test("Continue commits an event reward exactly once to state, history and persistence", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const game =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    game.state.started = true;
    game.state.origin = "NA";
    game.state.paused = true;
    game.state.pts = 20;
    game.state.log = [];
    game.ui.mode = "play";
    game.save();
    game.showEvent({
      kind: "OPPORTUNITY",
      title: "Reward contract",
      body: "A known reward.",
      choices: [
        { label: "Earn five", hint: "Compute +5", fx: () => game.FX.pts(5) },
      ],
    });
  });
  await page.locator("#evChoices button").click();
  await expect(page.locator("#evOutcome")).toContainText("Compute +5");
  const snapshot = () =>
    page.evaluate(() => {
      const game =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      return {
        pts: game.state.pts,
        log: game.state.log,
        saved: JSON.parse(localStorage.getItem(game.KEY)!) as GameState,
      };
    });
  const preview = await snapshot();
  expect(preview.pts).toBe(20);
  expect(preview.log).toEqual([]);
  expect(preview.saved.pts).toBe(20);
  expect(preview.saved.log).toEqual([]);
  await page.locator("#evBack").click();
  await page.locator("#evChoices button").click();
  await page.locator("#evContinue").click();
  await expect(page.locator("#eventModal")).toBeHidden();
  const committed = await snapshot();
  expect(committed.pts).toBe(25);
  expect(committed.log).toHaveLength(1);
  expect(committed.log[0]).toMatchObject({
    title: "Reward contract",
    out: "Compute +5",
  });
  expect(committed.saved.pts).toBe(25);
  expect(committed.saved.log).toEqual(committed.log);
  // A queued duplicate click may reach the old handler after the dialog closes.
  await page.locator("#evContinue").evaluate((element) => {
    if (element instanceof HTMLButtonElement) element.click();
  });
  const repeated = await snapshot();
  expect(repeated.pts).toBe(committed.pts);
  expect(repeated.log).toEqual(committed.log);
  expect(repeated.saved.pts).toBe(committed.saved.pts);
  expect(repeated.saved.log).toEqual(committed.saved.log);
});
