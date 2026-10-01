import type { GameAppElement } from "../../src/env";
import { test, expect } from "@playwright/test";

test("F14 preview is isolated, committed containment closes a briefing before any rescue", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    Object.assign(migratedGame.state, {
      started: true,
      origin: "NA",
      contain: 99,
      pts: 100,
      paused: true,
    });
    migratedGame.ui.screenMode = "play";
    migratedGame.state.brief.dec = [
      { t: "ev", id: "warden" },
      { t: "ev", id: "fridge" },
    ];
    migratedGame.openBriefing();
  });
  await page.locator("#evChoices button").nth(1).click();
  expect(
    await page.evaluate(() => {
      const migratedGame =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      return [migratedGame.state.contain, migratedGame.state.ended];
    }),
  ).toEqual([99, null]);
  await page.locator("#evContinue").click();
  expect(
    await page.evaluate(() => {
      const migratedGame =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      return {
        contain: migratedGame.state.contain,
        ended: migratedGame.state.ended?.kind,
        brief: migratedGame.ui.activeBriefing,
        saved: JSON.parse(localStorage.getItem(migratedGame.saveStorageKey)!)
          .ended?.kind,
      };
    }),
  ).toEqual({ contain: 100, ended: "lose", brief: null, saved: "lose" });
  await expect(page.locator("#eventModal")).toBeHidden();
});

test("F14 composite choice resolves only after every effect and uses win-first ties", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    Object.assign(migratedGame.state, {
      started: true,
      origin: "NA",
      phase: 2,
      directive: "upload",
      dprog: 99,
      contain: 99,
      pts: 0,
      paused: true,
    });
    migratedGame.ui.screenMode = "play";
    migratedGame.showEvent({
      kind: "INCIDENT",
      title: "Composite",
      body: "All effects are atomic.",
      choices: [
        {
          label: "Complete",
          hint: "Win",
          applyEffects: () => {
            const containmentOutcome =
              migratedGame.effects.adjustContainment(5);
            migratedGame.state.dprog = 100;
            migratedGame.effects.adjustCompute(17);
            return containmentOutcome;
          },
        },
      ],
    });
  });
  await page.locator("#evChoices button").click();
  await page.locator("#evContinue").click();
  expect(
    await page.evaluate(() => {
      const migratedGame =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      return {
        kind: migratedGame.state.ended?.kind,
        dprog: migratedGame.state.dprog,
        pts: migratedGame.state.pts,
        log: migratedGame.state.log[0].title,
      };
    }),
  ).toEqual({ kind: "win", dprog: 100, pts: 17, log: "Composite" });
});
