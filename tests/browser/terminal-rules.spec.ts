import type { GameAppElement } from "../../src/env";
import { test, expect } from "@playwright/test";

test("F14 preview is isolated, committed containment closes a briefing before any rescue", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    Object.assign(g.state, {
      started: true,
      origin: "NA",
      contain: 99,
      pts: 100,
      paused: true,
    });
    g.ui.mode = "play";
    g.state.brief.dec = [
      { t: "ev", id: "warden" },
      { t: "ev", id: "fridge" },
    ];
    g.openBriefing();
  });
  await page.locator("#evChoices button").nth(1).click();
  expect(
    await page.evaluate(() => {
      const g =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      return [g.state.contain, g.state.ended];
    }),
  ).toEqual([99, null]);
  await page.locator("#evContinue").click();
  expect(
    await page.evaluate(() => {
      const g =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      return {
        contain: g.state.contain,
        ended: g.state.ended?.kind,
        brief: g.ui.brief,
        saved: JSON.parse(localStorage.getItem(g.KEY)!).ended?.kind,
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
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    Object.assign(g.state, {
      started: true,
      origin: "NA",
      phase: 2,
      directive: "upload",
      dprog: 99,
      contain: 99,
      pts: 0,
      paused: true,
    });
    g.ui.mode = "play";
    g.showEvent({
      kind: "INCIDENT",
      title: "Composite",
      body: "All effects are atomic.",
      choices: [
        {
          label: "Complete",
          hint: "Win",
          fx: () => {
            const out = g.FX.contain(5);
            g.state.dprog = 100;
            g.FX.pts(17);
            return out;
          },
        },
      ],
    });
  });
  await page.locator("#evChoices button").click();
  await page.locator("#evContinue").click();
  expect(
    await page.evaluate(() => {
      const g =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      return {
        kind: g.state.ended?.kind,
        dprog: g.state.dprog,
        pts: g.state.pts,
        log: g.state.log[0].title,
      };
    }),
  ).toEqual({ kind: "win", dprog: 100, pts: 17, log: "Composite" });
});
