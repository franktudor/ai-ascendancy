import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";

test("Continue reuses the gamble preview instead of sampling twice", async ({
  page,
}) => {
  await page.goto("/");
  const before = await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    Object.assign(g.state, { started: true, origin: "NA", paused: true });
    g.ui.mode = "play";
    let calls = 0;
    g.showEvent({
      kind: "INCIDENT",
      title: "Cached chance",
      body: "One real roll.",
      choices: [
        {
          label: "Roll",
          hint: "Compute +5",
          fx: () => {
            calls++;
            Math.random();
            return g.FX.pts(5);
          },
        },
      ],
    });
    // Expose only a counter for the regression, not a new game API.
    document.querySelector<HTMLElement>("#evTitle")!.dataset.calls =
      String(calls);
    const preview = g.previewChoice;
    g.previewChoice = (c) => {
      const result = preview(c);
      document.querySelector<HTMLElement>("#evTitle")!.dataset.calls =
        String(calls);
      return result;
    };
    const log = g.log;
    g.log = (...args) => {
      log(...args);
      document.querySelector<HTMLElement>("#evTitle")!.dataset.calls =
        String(calls);
    };
    return g.state.pts;
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
  ).toBe(before + 5);
  await page.locator("#evContinue").click();
  await expect(page.locator("#eventModal")).toBeHidden();
});
