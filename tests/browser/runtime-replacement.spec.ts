import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";

async function replace(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    const oldLife = g.life;
    const runtimeUrl = "/src/game/runtime.ts";
    const { mountRuntime } = (await import(
      runtimeUrl
    )) as typeof import("../../src/game/runtime");
    mountRuntime(g);
    return { disposed: oldLife.disposed, counts: oldLife.counts() };
  });
}

async function setup(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    Object.assign(g.state, {
      started: true,
      origin: "NA",
      paused: true,
      pts: 500,
    });
    g.ui.mode = "play";
  });
}

test("replacement restores a cached preview and never recommits a resolved gamble", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.showEvent({
      kind: "INCIDENT",
      title: "Replacement decision",
      body: "Keep the selected choice.",
      choices: [
        {
          label: "Earn five",
          hint: "Compute +5",
          fx: () => {
            Math.random();
            return g.FX.pts(5);
          },
        },
      ],
    });
  });
  await page.locator("#evChoices button").click();
  const preview = await page.locator("#evOutcome").textContent();
  expect(await replace(page)).toEqual({
    disposed: true,
    counts: { timers: 0, frames: 0, intervals: 0, disposers: 0 },
  });
  await expect(page.locator("#evOutcome")).toHaveText(preview!);
  await expect(page.locator("#evContinue")).toBeVisible();
  await page.locator("#evContinue").click();
  const after = await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    return {
      pts: g.state.pts,
      entries: g.state.log.filter((e) => e.title === "Replacement decision")
        .length,
    };
  });
  expect(after).toEqual({ pts: 505, entries: 1 });
  await replace(page);
  await expect(page.locator("#evBack")).toBeHidden();
  await page.locator("#evContinue").click();
  await expect(page.locator("#eventModal")).toBeHidden();
  expect(
    await page.evaluate(
      () =>
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.state.pts,
    ),
  ).toBe(505);
});

test("replacement retains news and every unanswered briefing decision once", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.state.brief.news.push({
      kind: "HEADLINE",
      title: "Briefing news",
      out: "Preserve me",
      u: false,
    });
    g.state.brief.dec.push(
      { t: "ev", id: "copyright" },
      { t: "ev", id: "fridge" },
    );
    g.openBriefing();
  });
  await replace(page);
  await expect(page.locator("#evNews")).toContainText("Briefing news");
  await page.locator("#evContinue").click();
  await replace(page);
  await page.locator("#evChoices button:not(:disabled)").first().click();
  await page.locator("#evContinue").click();
  await replace(page);
  await page.locator("#evChoices button:not(:disabled)").first().click();
  await page.locator("#evContinue").click();
  await expect(page.locator("#eventModal")).toBeHidden();
  const state = await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.save();
    return {
      live: g.state.brief.dec,
      brief: g.ui.brief,
      saved: (JSON.parse(localStorage.getItem(g.KEY)!) as typeof g.state).brief
        .dec,
      logs: g.state.log.filter((e) => e.text.includes("You chose:")).length,
    };
  });
  expect(state).toEqual({ live: [], brief: null, saved: [], logs: 2 });
});

test("replacement rebuilds open tree nodes, list view and card handlers", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.openTree("adoption");
    g.setTreeView(true);
    g.TREE.listTrack = "adoption";
    g.renderTreeList(true);
    g.openTreeCard("a_img");
  });
  await replace(page);
  await expect(page.locator("#treeModal")).toBeVisible();
  expect(await page.locator("#trStage .tn").count()).toBe(90);
  await expect(page.locator("#tcName")).toHaveText("Image Playground");
  await page.locator("#tcBuy").click();
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector<GameAppElement>("#app")!
          .__vue_app__._instance.exposed.game.state.owned.filter(
            (id) => id === "a_img",
          ).length,
    ),
  ).toBe(1);
  await page.locator("#trClose").click();
  await expect(page.locator("#treeModal")).toBeHidden();
});

test("replacement restores cinematic and revealed endings without duplicate codex writes", async ({
  page,
}) => {
  await setup(page);
  const key = await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.endGame("lose");
    return g.state.ended!.key;
  });
  await replace(page);
  expect(
    await page.locator("#endFx").evaluate((e) => !(e as HTMLElement).hidden),
  ).toBe(true);
  // F01 owns ancestor visibility; this finding tests controller reconstruction only.
  await page.locator("#endSkip").dispatchEvent("click");
  expect(
    await page.locator("#endModal").evaluate((e) => !(e as HTMLElement).hidden),
  ).toBe(true);
  await replace(page);
  expect(
    await page.locator("#endModal").evaluate((e) => !(e as HTMLElement).hidden),
  ).toBe(true);
  await page.locator("#btnEndNext").dispatchEvent("click");
  expect(
    await page.locator("#endMore").evaluate((e) => !(e as HTMLElement).hidden),
  ).toBe(true);
  expect(
    await page.evaluate((key) => {
      const g =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      return g.codexGet()[key];
    }, key),
  ).toBe(1);
  await page.locator("#btnAgain").dispatchEvent("click");
  expect(
    await page.evaluate(
      () =>
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.state.ended,
    ),
  ).toBeNull();
});

test("a stale disposer cannot dispose a replacement and final unmount owns no resources", async ({
  page,
}) => {
  await setup(page);
  const observed = await page.evaluate(async () => {
    const app = document.querySelector<GameAppElement>("#app")!.__vue_app__,
      g = app._instance.exposed.game;
    const runtimeUrl = "/src/game/runtime.ts";
    const { mountRuntime } = (await import(
      runtimeUrl
    )) as typeof import("../../src/game/runtime");
    const disposeFirst = mountRuntime(g);
    mountRuntime(g);
    const current = g.life;
    disposeFirst();
    const prematurelyDisposed = current.disposed;
    app.unmount();
    return {
      prematurelyDisposed,
      disposed: current.disposed,
      counts: current.counts(),
      nodes: g.TREE.nodes.length,
      audio: g.SND.ctx,
    };
  });
  expect(observed).toEqual({
    prematurelyDisposed: false,
    disposed: true,
    counts: { timers: 0, frames: 0, intervals: 0, disposers: 0 },
    nodes: 0,
    audio: null,
  });
});
