import type { GameAppElement } from "../../src/env";
import { test, expect } from "@playwright/test";

test("F18 preview never leaks peak; each committed adoption gain records it", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    Object.assign(g.state, {
      started: true,
      origin: "NA",
      pts: 1000,
      paused: true,
    });
    g.ui.mode = "play";
    g.state.regions.forEach((r) => {
      r.a = 0.5;
    });
    const e = g.EVENTS.find((e) => e.id === "h_pinned")!;
    const c = e.choices![0];
    const state = g.state,
      before = JSON.stringify(state);
    g.previewChoice(c);
    const isolated = state === g.state && before === JSON.stringify(g.state);
    g.showEvent({ ...e, choices: [c] });
    return isolated;
  });
  expect(result).toBe(true);
  await page.locator("#evChoices button").click();
  await page.locator("#evContinue").click();
  expect(
    await page.evaluate(() => {
      const g =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      const peak = g.reach();
      g.EVENTS.find((e) => e.id === "sw_price")!.choices![3].fx();
      return g.state.stats.peak === peak && g.reach() < peak;
    }),
  ).toBe(true);
});
