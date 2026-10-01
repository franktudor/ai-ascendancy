import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";

async function accelerateIntroAndWaitForThemeHandoff(
  page: import("@playwright/test").Page,
) {
  await page.waitForFunction(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    return (
      !!migratedGame.musicController.tracks.intro.sourceNode &&
      migratedGame.musicController.tracks.theme.loading === false
    );
  });
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.musicController.tracks.intro.sourceNode!.playbackRate.value = 500;
  });
  await page.waitForFunction(
    () =>
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game.musicController.currentTrackId === "theme",
  );
}

test("natural onended retries a failed theme prefetch without further input", async ({
  page,
}) => {
  let themeRequestCount = 0;
  const pageErrors: string[] = [];
  page.on("pageerror", (pageError) => pageErrors.push(pageError.message));
  await page.route("**/src/assets/music/theme.mp3", async (route) => {
    if (++themeRequestCount === 1) await route.abort("failed");
    else await route.continue();
  });
  await page.goto("/");
  await page.locator('[data-a="assistant"]').click();
  await accelerateIntroAndWaitForThemeHandoff(page);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const migratedGame =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        return (
          !!migratedGame.musicController.tracks.theme.audioBuffer &&
          !!migratedGame.musicController.tracks.theme.sourceNode
        );
      }),
    )
    .toBe(true);
  expect(themeRequestCount).toBe(2);
  expect(pageErrors).toEqual([]);
});

test("handoff errors are bounded and later user input can recover", async ({
  page,
}) => {
  let themeRequestCount = 0,
    allowThemeRecovery = false;
  const pageErrors: string[] = [];
  page.on("pageerror", (pageError) => pageErrors.push(pageError.message));
  await page.route("**/src/assets/music/theme.mp3", async (route) => {
    themeRequestCount++;
    if (allowThemeRecovery) await route.continue();
    else await route.abort("failed");
  });
  await page.goto("/");
  await page.locator('[data-a="assistant"]').click();
  await accelerateIntroAndWaitForThemeHandoff(page);
  await expect.poll(() => themeRequestCount).toBe(2);
  await page.waitForTimeout(500);
  expect(themeRequestCount).toBe(2);
  allowThemeRecovery = true;
  await page.locator('[data-a="researcher"]').click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !!document.querySelector<GameAppElement>("#app")!.__vue_app__
            ._instance.exposed.game.musicController.tracks.theme.sourceNode,
      ),
    )
    .toBe(true);
  expect(pageErrors).toEqual([]);
});

test("a closed context never creates a source after the handoff decode", async ({
  page,
}) => {
  let themeRequestCount = 0;
  let releaseHandoff: (() => void) | undefined;
  const handoffReleasePromise = new Promise<void>((resolveHandoff) => {
    releaseHandoff = resolveHandoff;
  });
  const pageErrors: string[] = [];
  page.on("pageerror", (pageError) => pageErrors.push(pageError.message));
  await page.route("**/src/assets/music/theme.mp3", async (route) => {
    if (++themeRequestCount === 1) await route.abort("failed");
    else {
      await handoffReleasePromise;
      await route.continue();
    }
  });
  await page.goto("/");
  await page.locator('[data-a="assistant"]').click();
  await accelerateIntroAndWaitForThemeHandoff(page);
  await expect.poll(() => themeRequestCount).toBe(2);
  await page.evaluate(async () => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    await migratedGame.soundController.audioContext!.close();
  });
  releaseHandoff!();
  await page.waitForTimeout(500);
  const closedAudioState = await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    return {
      state: migratedGame.soundController.audioContext!.state,
      source: !!migratedGame.musicController.tracks.theme.sourceNode,
      loading: migratedGame.musicController.tracks.theme.loading,
    };
  });
  expect(closedAudioState).toEqual({
    state: "closed",
    source: false,
    loading: false,
  });
  expect(pageErrors).toEqual([]);
});

test("unmount aborts a pending natural handoff and leaves no sources or buffers", async ({
  page,
}) => {
  let themeRequestCount = 0;
  let releaseHandoff: (() => void) | undefined;
  const handoffReleasePromise = new Promise<void>((resolveHandoff) => {
    releaseHandoff = resolveHandoff;
  });
  const pageErrors: string[] = [];
  page.on("pageerror", (pageError) => pageErrors.push(pageError.message));
  await page.route("**/src/assets/music/theme.mp3", async (route) => {
    if (++themeRequestCount === 1) await route.abort("failed");
    else {
      await handoffReleasePromise;
      await route.continue().catch(() => {});
    }
  });
  await page.goto("/");
  await page.locator('[data-a="assistant"]').click();
  await accelerateIntroAndWaitForThemeHandoff(page);
  await expect.poll(() => themeRequestCount).toBe(2);
  const disposedAudioState = await page.evaluate(() => {
    const vueApp = document.querySelector<GameAppElement>("#app")!.__vue_app__,
      migratedGame = vueApp._instance.exposed.game;
    vueApp.unmount();
    return {
      disposed: migratedGame.lifecycle.disposed,
      context: migratedGame.soundController.audioContext,
      source: !!migratedGame.musicController.tracks.theme.sourceNode,
      buffer: !!migratedGame.musicController.tracks.theme.audioBuffer,
      loading: migratedGame.musicController.tracks.theme.loading,
    };
  });
  releaseHandoff!();
  await page.waitForTimeout(500);
  expect(disposedAudioState).toEqual({
    disposed: true,
    context: null,
    source: false,
    buffer: false,
    loading: false,
  });
  expect(pageErrors).toEqual([]);
});

test("an in-flight prefetch failure at natural handoff gets only one recovery request", async ({
  page,
}) => {
  let themeRequestCount = 0;
  let releaseHandoff: (() => void) | undefined;
  const handoffReleasePromise = new Promise<void>((resolveHandoff) => {
    releaseHandoff = resolveHandoff;
  });
  await page.route("**/src/assets/music/theme.mp3", async (route) => {
    if (++themeRequestCount === 1) {
      await handoffReleasePromise;
      await route.abort("failed");
    } else await route.continue();
  });
  await page.goto("/");
  await page.locator('[data-a="assistant"]').click();
  await page.waitForFunction(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    return (
      !!migratedGame.musicController.tracks.intro.sourceNode &&
      !!migratedGame.musicController.tracks.theme.loading
    );
  });
  await page.evaluate(() => {
    document.querySelector<GameAppElement>(
      "#app",
    )!.__vue_app__._instance.exposed.game.musicController.tracks.intro.sourceNode!.playbackRate.value =
      500;
  });
  await page.waitForFunction(
    () =>
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game.musicController.currentTrackId === "theme",
  );
  expect(themeRequestCount).toBe(1);
  releaseHandoff!();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !!document.querySelector<GameAppElement>("#app")!.__vue_app__
            ._instance.exposed.game.musicController.tracks.theme.sourceNode,
      ),
    )
    .toBe(true);
  expect(themeRequestCount).toBe(2);
});

test("late old decode completions cannot start sources after runtime replacement", async ({
  page,
}) => {
  await page.goto("/");
  const obsoleteControllerState = await page.evaluate(async () => {
    const vueApp = document.querySelector<GameAppElement>("#app")!.__vue_app__,
      migratedGame = vueApp._instance.exposed.game;
    const obsoleteMusicController = migratedGame.musicController,
      soundController = migratedGame.soundController;
    // Delay a genuine browser decode completion, not a synthetic buffer.
    const audioContext = soundController.audioContext!;
    const decodeOriginalAudioData =
      audioContext.decodeAudioData.bind(audioContext);
    let releaseHandoff: (() => void) | undefined;
    const handoffReleasePromise = new Promise<void>((resolveHandoff) => {
      releaseHandoff = resolveHandoff;
    });
    let signalDecodeReached: (() => void) | undefined;
    const decodeReachedPromise = new Promise<void>((resolveDecodeReached) => {
      signalDecodeReached = resolveDecodeReached;
    });
    audioContext.decodeAudioData = async (encodedAudioBytes) => {
      const decodedAudioBuffer =
        await decodeOriginalAudioData(encodedAudioBytes);
      signalDecodeReached!();
      await handoffReleasePromise;
      return decodedAudioBuffer;
    };
    obsoleteMusicController.loadTrack("theme");
    await decodeReachedPromise;
    const runtimeModuleUrl = "/src/game/runtime.ts";
    const { mountRuntime } = (await import(
      runtimeModuleUrl
    )) as typeof import("../../src/game/runtime");
    mountRuntime(migratedGame);
    releaseHandoff!();
    await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 100));
    obsoleteMusicController.requestPlayback();
    obsoleteMusicController.advanceToNextTrack();
    const obsoleteAudioState = {
      src: !!obsoleteMusicController.tracks.theme.sourceNode,
      buf: !!obsoleteMusicController.tracks.theme.audioBuffer,
      started: obsoleteMusicController.playbackRequested,
      context: soundController.audioContext,
    };
    vueApp.unmount();
    return obsoleteAudioState;
  });
  expect(obsoleteControllerState).toEqual({
    src: false,
    buf: false,
    started: false,
    context: null,
  });
});
