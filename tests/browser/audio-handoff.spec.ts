import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";

async function finishIntro(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    return !!g.MUSIC.T.intro.src && g.MUSIC.T.theme.loading === false;
  });
  await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.MUSIC.T.intro.src!.playbackRate.value = 500;
  });
  await page.waitForFunction(
    () =>
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game.MUSIC.cur === "theme",
  );
}

test("natural onended retries a failed theme prefetch without further input", async ({
  page,
}) => {
  let requests = 0;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/src/assets/music/theme.mp3", async (route) => {
    if (++requests === 1) await route.abort("failed");
    else await route.continue();
  });
  await page.goto("/");
  await page.locator('[data-a="assistant"]').click();
  await finishIntro(page);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        return !!g.MUSIC.T.theme.buf && !!g.MUSIC.T.theme.src;
      }),
    )
    .toBe(true);
  expect(requests).toBe(2);
  expect(errors).toEqual([]);
});

test("handoff errors are bounded and later user input can recover", async ({
  page,
}) => {
  let requests = 0,
    recover = false;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/src/assets/music/theme.mp3", async (route) => {
    requests++;
    if (recover) await route.continue();
    else await route.abort("failed");
  });
  await page.goto("/");
  await page.locator('[data-a="assistant"]').click();
  await finishIntro(page);
  await expect.poll(() => requests).toBe(2);
  await page.waitForTimeout(500);
  expect(requests).toBe(2);
  recover = true;
  await page.locator('[data-a="researcher"]').click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !!document.querySelector<GameAppElement>("#app")!.__vue_app__
            ._instance.exposed.game.MUSIC.T.theme.src,
      ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

test("a closed context never creates a source after the handoff decode", async ({
  page,
}) => {
  let requests = 0;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/src/assets/music/theme.mp3", async (route) => {
    if (++requests === 1) await route.abort("failed");
    else {
      await gate;
      await route.continue();
    }
  });
  await page.goto("/");
  await page.locator('[data-a="assistant"]').click();
  await finishIntro(page);
  await expect.poll(() => requests).toBe(2);
  await page.evaluate(async () => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    await g.SND.ctx!.close();
  });
  release!();
  await page.waitForTimeout(500);
  const audio = await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    return {
      state: g.SND.ctx!.state,
      source: !!g.MUSIC.T.theme.src,
      loading: g.MUSIC.T.theme.loading,
    };
  });
  expect(audio).toEqual({ state: "closed", source: false, loading: false });
  expect(errors).toEqual([]);
});

test("unmount aborts a pending natural handoff and leaves no sources or buffers", async ({
  page,
}) => {
  let requests = 0;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/src/assets/music/theme.mp3", async (route) => {
    if (++requests === 1) await route.abort("failed");
    else {
      await gate;
      await route.continue().catch(() => {});
    }
  });
  await page.goto("/");
  await page.locator('[data-a="assistant"]').click();
  await finishIntro(page);
  await expect.poll(() => requests).toBe(2);
  const disposed = await page.evaluate(() => {
    const app = document.querySelector<GameAppElement>("#app")!.__vue_app__,
      g = app._instance.exposed.game;
    app.unmount();
    return {
      disposed: g.life.disposed,
      context: g.SND.ctx,
      source: !!g.MUSIC.T.theme.src,
      buffer: !!g.MUSIC.T.theme.buf,
      loading: g.MUSIC.T.theme.loading,
    };
  });
  release!();
  await page.waitForTimeout(500);
  expect(disposed).toEqual({
    disposed: true,
    context: null,
    source: false,
    buffer: false,
    loading: false,
  });
  expect(errors).toEqual([]);
});

test("an in-flight prefetch failure at natural handoff gets only one recovery request", async ({
  page,
}) => {
  let requests = 0;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/src/assets/music/theme.mp3", async (route) => {
    if (++requests === 1) {
      await gate;
      await route.abort("failed");
    } else await route.continue();
  });
  await page.goto("/");
  await page.locator('[data-a="assistant"]').click();
  await page.waitForFunction(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    return !!g.MUSIC.T.intro.src && !!g.MUSIC.T.theme.loading;
  });
  await page.evaluate(() => {
    document.querySelector<GameAppElement>(
      "#app",
    )!.__vue_app__._instance.exposed.game.MUSIC.T.intro.src!.playbackRate.value =
      500;
  });
  await page.waitForFunction(
    () =>
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game.MUSIC.cur === "theme",
  );
  expect(requests).toBe(1);
  release!();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !!document.querySelector<GameAppElement>("#app")!.__vue_app__
            ._instance.exposed.game.MUSIC.T.theme.src,
      ),
    )
    .toBe(true);
  expect(requests).toBe(2);
});

test("late old decode completions cannot start sources after runtime replacement", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const app = document.querySelector<GameAppElement>("#app")!.__vue_app__,
      g = app._instance.exposed.game;
    const old = g.MUSIC,
      sound = g.SND;
    // Delay a genuine browser decode completion, not a synthetic buffer.
    const c = sound.ctx!;
    const decode = c.decodeAudioData.bind(c);
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reached: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      reached = resolve;
    });
    c.decodeAudioData = async (bytes) => {
      const buffer = await decode(bytes);
      reached!();
      await gate;
      return buffer;
    };
    old.load("theme");
    await pending;
    const runtimeUrl = "/src/game/runtime.ts";
    const { mountRuntime } = (await import(
      runtimeUrl
    )) as typeof import("../../src/game/runtime");
    mountRuntime(g);
    release!();
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    old.start();
    old.next();
    const obsolete = {
      src: !!old.T.theme.src,
      buf: !!old.T.theme.buf,
      started: old.started,
      context: sound.ctx,
    };
    app.unmount();
    return obsolete;
  });
  expect(result).toEqual({
    src: false,
    buf: false,
    started: false,
    context: null,
  });
});
