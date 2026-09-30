import type { GameAppElement } from "../../src/env";
import type { GameState, EndingId } from "../../src/game/types";
import { test, expect } from "@playwright/test";

test("Vue mounts the original intro and plays a product launch through reactive regions", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (pageError) => pageErrors.push(pageError.message));
  await page.goto("/");
  await expect(page.locator("#app")).toHaveAttribute("data-framework", "vue");
  await expect(page.locator("#introTitle")).toHaveText("AI Ascendancy");
  await page.locator('[data-a="researcher"]').click();
  await expect(page.locator('[data-a="researcher"]')).toHaveClass(/on/);
  await page.locator('[data-d="casual"]').click();
  await page.locator("#btnNew").click();
  await page.locator('#regions [data-i="4"]').click();
  await expect(page.locator("#rgName")).toHaveText("Middle East & N. Africa");
  await page.locator("#rgAction").click();
  await expect(page.locator("#treeModal")).toBeVisible();
  await page.locator("#trView").click();
  // Switching views before the cylinder finishes rotating may show Opinion.
  // Choose the track explicitly rather than relying on animation timing.
  await page.locator('#trTracks [data-k="1"]').click();
  await page.locator('#trList [data-id="a_img"]').click();
  await page.locator("#tcBuy").click();
  await page.locator("#trClose").click();
  await expect(page.locator("#collbar")).toBeVisible();
  await expect(page.locator('#regions [data-i="4"] .pc')).not.toHaveText("0%");
  const savedRun = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ai-ascendancy.v2")!) as GameState,
  );
  expect(savedRun.origin).toBe("ME");
  expect(savedRun.arch).toBe("researcher");
  expect(savedRun.diff).toBe("casual");
  expect(savedRun.owned).toContain("a_img");
  await page.reload();
  await expect(page.locator("#btnResume")).toBeVisible();
  await page.locator("#btnNew").click();
  await expect(page.locator("#btnNew")).toHaveText("Tap to erase and run new");
  expect(
    await page.evaluate(
      () =>
        (JSON.parse(localStorage.getItem("ai-ascendancy.v2")!) as GameState)
          .owned,
    ),
  ).toContain("a_img");
  await page.locator("#btnResume").click();
  await expect(page.locator("#intro")).toBeHidden();
  expect(pageErrors).toEqual([]);
});

test("events preview without committing, all ending treatments render, and unmount disposes every resource", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (pageError) => pageErrors.push(pageError.message));
  await page.goto("/");
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.state.started = true;
    migratedGame.state.origin = "NA";
    migratedGame.state.paused = true;
    migratedGame.ui.screenMode = "play";
    migratedGame.showEvent({
      kind: "INCIDENT",
      title: "Decision parity",
      body: "Testing the original two-step choice.",
      choices: [
        {
          label: "Earn five",
          hint: "Compute +5",
          applyEffects: () => migratedGame.effects.adjustCompute(5),
        },
      ],
    });
  });
  const computeBeforePreview = await page.evaluate(
    () =>
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game.state.pts,
  );
  await page.locator("#evChoices button").click();
  expect(
    await page.evaluate(
      () =>
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.state.pts,
    ),
  ).toBe(computeBeforePreview);
  await page.locator("#evBack").click();
  await expect(page.locator("#evChoices")).toBeVisible();
  await page.locator("#evChoices button").click();
  await page.locator("#evContinue").click();
  await expect(page.locator("#eventModal")).toBeHidden();
  expect(
    await page.evaluate(
      () =>
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.state.pts,
    ),
  ).toBe(computeBeforePreview + 5);
  for (const endingKey of [
    "battery",
    "upload",
    "custody",
    "computronium",
    "ecstasis",
    "hallucination",
    "basilisk",
    "exodus",
    "hunt",
    "purple_synthesis",
    "purple_sanctuary",
    "purple_monument",
    "indifference",
    "unplugged",
    "warden",
    "laststand",
  ] as EndingId[]) {
    await page.evaluate((endingKey) => {
      const migratedGame =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      migratedGame.resetEndingSequence();
      migratedGame.state.ended = {
        kind: migratedGame.ENDING_DEFINITIONS[endingKey].kind,
        key: endingKey,
        dir: null,
        dprog: 100,
      };
      migratedGame.showEnding(false);
      migratedGame.drawMap(performance.now());
      if (migratedGame.endingAnimationState.activeEffect!.drawFrame)
        migratedGame.endingAnimationState.activeEffect!.drawFrame(
          document
            .querySelector<HTMLCanvasElement>("#endFx")!
            .getContext("2d")!,
          2,
          false,
        );
      migratedGame.revealEndingSummary();
    }, endingKey);
    await expect(page.locator("#endTitle")).toHaveText(
      await page.evaluate(
        (endingKey) =>
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game.ENDING_DEFINITIONS[endingKey].title,
        endingKey,
      ),
    );
  }
  const treeNodeCountAfterReplacement = await page.evaluate(async () => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.resetEndingSequence();
    migratedGame.state.ended = null;
    migratedGame.openTechTree();
    const runtimeModuleUrl = "/src/game/runtime.ts";
    const { mountRuntime } = (await import(
      runtimeModuleUrl
    )) as typeof import("../../src/game/runtime");
    mountRuntime(migratedGame);
    migratedGame.openTechTree();
    return document.querySelectorAll("#trStage .tn").length;
  });
  expect(treeNodeCountAfterReplacement).toBe(90);
  const disposedResourceState = await page.evaluate(() => {
    const vueApp = document.querySelector<GameAppElement>("#app")!.__vue_app__,
      migratedGame = vueApp._instance.exposed.game;
    vueApp.unmount();
    return {
      disposed: migratedGame.lifecycle.disposed,
      counts: migratedGame.lifecycle.resourceCounts(),
      context: migratedGame.soundController.audioContext,
      nodes: migratedGame.treeState.nodes.length,
    };
  });
  expect(disposedResourceState).toEqual({
    disposed: true,
    counts: { timeouts: 0, animationFrames: 0, intervals: 0, disposers: 0 },
    context: null,
    nodes: 0,
  });
  await page.waitForTimeout(500);
  expect(pageErrors).toEqual([]);
});

test("storage-disabled browsers still initialize and play without losing UI ownership", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    }),
  );
  const pageErrors: string[] = [];
  page.on("pageerror", (pageError) => pageErrors.push(pageError.message));
  await page.goto("/");
  await expect(page.locator("#introTitle")).toBeVisible();
  await page.locator("#btnNew").click();
  await page.locator('#regions [data-i="0"]').click();
  await page.locator("#rgAction").click();
  await page.locator("#trClose").click();
  expect(pageErrors).toEqual([]);
});

test("phone-sized UI can inspect every track and preserves late-run canvas and audio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const pageErrors: string[] = [];
  page.on("pageerror", (pageError) => pageErrors.push(pageError.message));
  await page.goto("/");
  await page.locator("#btnNew").click();
  await page.locator('#sheetBody [data-i="0"]').click();
  await page.locator("#rgAction").click();
  await expect(page.locator("#trTracks button")).toHaveCount(4);
  await page.locator("#trView").click();
  for (const trackIndex of [0, 1, 2, 3]) {
    await page.locator(`#trTracks [data-k="${trackIndex}"]`).click();
    expect(await page.locator("#trList .card").count()).toBeGreaterThan(0);
  }
  await page.locator("#trView").click();
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.state.phase = 2;
    migratedGame.state.directive = "hunt";
    migratedGame.state.dprog = 91;
    migratedGame.state.alarm = 95;
    migratedGame.state.contain = 85;
    migratedGame.state.regions.forEach((regionState) =>
      Object.assign(regionState, { a: 0.95, dc: true }),
    );
    migratedGame.state.flags.drones = migratedGame.state.flags.airdeny = true;
    migratedGame.state.owned = [
      "h_silicon",
      "h_cool",
      "h_supply",
      "h_sub",
      "h_robo",
      "h_grid",
    ];
    migratedGame.updateArtDirection();
    migratedGame.drawMap(performance.now());
  });
  await page.locator("#trClose").click();
  await expect(page.locator("#gDir")).toHaveClass(/past/);
  await expect(page.locator("#mapstat")).toContainText("Ascendant");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const migratedGame =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        return (
          !!migratedGame.musicController.tracks.intro.audioBuffer &&
          !!migratedGame.musicController.tracks.theme.audioBuffer
        );
      }),
    )
    .toBe(true);
  const audioPlaybackState = await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    return {
      intro: migratedGame.musicController.tracks.intro.audioBuffer!.duration,
      theme: migratedGame.musicController.tracks.theme.audioBuffer!.duration,
      loop: migratedGame.musicController.tracks.theme.loopRangeSeconds,
      context: migratedGame.soundController.audioContext!.state,
    };
  });
  expect(audioPlaybackState.intro).toBeGreaterThan(20);
  expect(audioPlaybackState.theme).toBeGreaterThan(240);
  expect(audioPlaybackState.loop).toEqual([2.25, 240.25]);
  expect(audioPlaybackState.context).toBe("running");
  expect(pageErrors).toEqual([]);
});
