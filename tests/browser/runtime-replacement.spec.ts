import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";

async function replaceRuntimeAndCaptureDisposal(
  page: import("@playwright/test").Page,
) {
  return page.evaluate(async () => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    const previousLifecycle = migratedGame.lifecycle;
    const runtimeModuleUrl = "/src/game/runtime.ts";
    const { mountRuntime } = (await import(
      runtimeModuleUrl
    )) as typeof import("../../src/game/runtime");
    mountRuntime(migratedGame);
    return {
      disposed: previousLifecycle.disposed,
      counts: previousLifecycle.resourceCounts(),
    };
  });
}

async function openPausedReplacementFixture(
  page: import("@playwright/test").Page,
) {
  await page.goto("/");
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    Object.assign(migratedGame.state, {
      started: true,
      origin: "NA",
      paused: true,
      pts: 500,
    });
    migratedGame.ui.screenMode = "play";
  });
}

test("replacement restores a cached preview and never recommits a resolved gamble", async ({
  page,
}) => {
  await openPausedReplacementFixture(page);
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.showEvent({
      kind: "INCIDENT",
      title: "Replacement decision",
      body: "Keep the selected choice.",
      choices: [
        {
          label: "Earn five",
          hint: "Compute +5",
          applyEffects: () => {
            Math.random();
            return migratedGame.effects.adjustCompute(5);
          },
        },
      ],
    });
  });
  await page.locator("#evChoices button").click();
  const cachedPreviewText = await page.locator("#evOutcome").textContent();
  expect(await replaceRuntimeAndCaptureDisposal(page)).toEqual({
    disposed: true,
    counts: { timeouts: 0, animationFrames: 0, intervals: 0, disposers: 0 },
  });
  await expect(page.locator("#evOutcome")).toHaveText(cachedPreviewText!);
  await expect(page.locator("#evContinue")).toBeVisible();
  await page.locator("#evContinue").click();
  const committedChoiceState = await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    return {
      pts: migratedGame.state.pts,
      entries: migratedGame.state.log.filter(
        (logEntry) => logEntry.title === "Replacement decision",
      ).length,
    };
  });
  expect(committedChoiceState).toEqual({ pts: 505, entries: 1 });
  await replaceRuntimeAndCaptureDisposal(page);
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
  await openPausedReplacementFixture(page);
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.state.brief.news.push({
      kind: "HEADLINE",
      title: "Briefing news",
      out: "Preserve me",
      u: false,
    });
    migratedGame.state.brief.dec.push(
      { t: "ev", id: "copyright" },
      { t: "ev", id: "fridge" },
    );
    migratedGame.openBriefing();
  });
  await replaceRuntimeAndCaptureDisposal(page);
  await expect(page.locator("#evNews")).toContainText("Briefing news");
  await page.locator("#evContinue").click();
  await replaceRuntimeAndCaptureDisposal(page);
  await page.locator("#evChoices button:not(:disabled)").first().click();
  await page.locator("#evContinue").click();
  await replaceRuntimeAndCaptureDisposal(page);
  await page.locator("#evChoices button:not(:disabled)").first().click();
  await page.locator("#evContinue").click();
  await expect(page.locator("#eventModal")).toBeHidden();
  const completedBriefingState = await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.saveRun();
    return {
      live: migratedGame.state.brief.dec,
      brief: migratedGame.ui.activeBriefing,
      saved: (
        JSON.parse(
          localStorage.getItem(migratedGame.saveStorageKey)!,
        ) as typeof migratedGame.state
      ).brief.dec,
      logs: migratedGame.state.log.filter((logEntry) =>
        logEntry.text.includes("You chose:"),
      ).length,
    };
  });
  expect(completedBriefingState).toEqual({
    live: [],
    brief: null,
    saved: [],
    logs: 2,
  });
});

test("replacement rebuilds open tree nodes, list view and card handlers", async ({
  page,
}) => {
  await openPausedReplacementFixture(page);
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.openTechTree("adoption");
    migratedGame.setTreeListView(true);
    migratedGame.treeState.listTrackId = "adoption";
    migratedGame.renderTreeList(true);
    migratedGame.openTreeCard("a_img");
  });
  await replaceRuntimeAndCaptureDisposal(page);
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
            (ownedUpgradeId) => ownedUpgradeId === "a_img",
          ).length,
    ),
  ).toBe(1);
  await page.locator("#trClose").click();
  await expect(page.locator("#treeModal")).toBeHidden();
});

test("replacement during card dismissal finishes hiding its pointer-blocking scrim", async ({
  page,
}) => {
  await openPausedReplacementFixture(page);
  await page.evaluate(async () => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    const runtimeModuleUrl = "/src/game/runtime.ts";
    const { mountRuntime } = (await import(
      runtimeModuleUrl
    )) as typeof import("../../src/game/runtime");
    migratedGame.openTechTree("adoption");
    migratedGame.setTreeListView(true);
    migratedGame.treeState.listTrackId = "adoption";
    migratedGame.renderTreeList(true);
    migratedGame.openTreeCard("a_img");
    migratedGame.closeTreeCard();
    // Replacement cancels the pending 200ms dismissal callback.
    mountRuntime(migratedGame);
  });
  await expect(page.locator("#tcard")).toBeHidden();
  await expect(page.locator("#tscrim")).toBeHidden();
  await page.locator('#trList [data-id="a_img"]').click();
  await expect(page.locator("#tcName")).toHaveText("Image Playground");
  await page.locator("#tcBuy").click();
  expect(
    await page.evaluate(() =>
      document
        .querySelector<GameAppElement>("#app")!
        .__vue_app__._instance.exposed.game.ownsUpgrade("a_img"),
    ),
  ).toBe(true);
});

test("replacement restores cinematic and revealed endings without duplicate codex writes", async ({
  page,
}) => {
  await openPausedReplacementFixture(page);
  const endingKey = await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.endGame("lose");
    return migratedGame.state.ended!.key;
  });
  await replaceRuntimeAndCaptureDisposal(page);
  expect(
    await page
      .locator("#endFx")
      .evaluate(
        (endingCanvasElement) => !(endingCanvasElement as HTMLElement).hidden,
      ),
  ).toBe(true);
  // F01 owns ancestor visibility; this finding tests controller reconstruction only.
  await page.locator("#endSkip").dispatchEvent("click");
  expect(
    await page
      .locator("#endModal")
      .evaluate(
        (endingModalElement) => !(endingModalElement as HTMLElement).hidden,
      ),
  ).toBe(true);
  await replaceRuntimeAndCaptureDisposal(page);
  expect(
    await page
      .locator("#endModal")
      .evaluate(
        (endingModalElement) => !(endingModalElement as HTMLElement).hidden,
      ),
  ).toBe(true);
  await page.locator("#btnEndNext").dispatchEvent("click");
  expect(
    await page
      .locator("#endMore")
      .evaluate(
        (endingDetailsElement) => !(endingDetailsElement as HTMLElement).hidden,
      ),
  ).toBe(true);
  expect(
    await page.evaluate((endingKey) => {
      const migratedGame =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      return migratedGame.getEndingDiscoveryCounts()[endingKey];
    }, endingKey),
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
  await openPausedReplacementFixture(page);
  const disposedResourceState = await page.evaluate(async () => {
    const vueApp = document.querySelector<GameAppElement>("#app")!.__vue_app__,
      migratedGame = vueApp._instance.exposed.game;
    const runtimeModuleUrl = "/src/game/runtime.ts";
    const { mountRuntime } = (await import(
      runtimeModuleUrl
    )) as typeof import("../../src/game/runtime");
    const disposePreviousRuntime = mountRuntime(migratedGame);
    mountRuntime(migratedGame);
    const currentLifecycle = migratedGame.lifecycle;
    disposePreviousRuntime();
    const wasCurrentLifecycleDisposedEarly = currentLifecycle.disposed;
    vueApp.unmount();
    return {
      prematurelyDisposed: wasCurrentLifecycleDisposedEarly,
      disposed: currentLifecycle.disposed,
      counts: currentLifecycle.resourceCounts(),
      nodes: migratedGame.treeState.nodes.length,
      audio: migratedGame.soundController.audioContext,
    };
  });
  expect(disposedResourceState).toEqual({
    prematurelyDisposed: false,
    disposed: true,
    counts: { timeouts: 0, animationFrames: 0, intervals: 0, disposers: 0 },
    nodes: 0,
    audio: null,
  });
});
