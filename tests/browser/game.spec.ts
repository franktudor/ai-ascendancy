import type { GameAppElement } from "../../src/env";
import type { GameState, EndingId } from "../../src/game/types";
import { test, expect } from "@playwright/test";

test("Vue mounts the original intro and plays a product launch through reactive regions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
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
  const save = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ai-ascendancy.v2")!) as GameState,
  );
  expect(save.origin).toBe("ME");
  expect(save.arch).toBe("researcher");
  expect(save.diff).toBe("casual");
  expect(save.owned).toContain("a_img");
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
  expect(errors).toEqual([]);
});

test("events preview without committing, all ending treatments render, and unmount disposes every resource", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.state.started = true;
    g.state.origin = "NA";
    g.ui.mode = "play";
    g.showEvent({
      kind: "INCIDENT",
      title: "Decision parity",
      body: "Testing the original two-step choice.",
      choices: [
        { label: "Earn five", hint: "Compute +5", fx: () => g.FX.pts(5) },
      ],
    });
  });
  const before = await page.evaluate(
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
  ).toBe(before);
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
  ).toBe(before + 5);
  for (const key of [
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
    await page.evaluate((key) => {
      const g =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      g.endReset();
      g.state.ended = { kind: g.ENDINGS[key].kind, key, dir: null, dprog: 100 };
      g.showEnd(false);
      g.drawMap(performance.now());
      if (g.ENDFX.fx!.draw)
        g.ENDFX.fx!.draw(
          document
            .querySelector<HTMLCanvasElement>("#endFx")!
            .getContext("2d")!,
          2,
          false,
        );
      g.endReveal();
    }, key);
    await expect(page.locator("#endTitle")).toHaveText(
      await page.evaluate(
        (key) =>
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game.ENDINGS[key].title,
        key,
      ),
    );
  }
  const beforeRemount = await page.evaluate(async () => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.endReset();
    g.state.ended = null;
    g.openTree();
    const runtimeUrl = "/src/game/runtime.ts";
    const { mountRuntime } = (await import(
      runtimeUrl
    )) as typeof import("../../src/game/runtime");
    mountRuntime(g);
    g.openTree();
    return document.querySelectorAll("#trStage .tn").length;
  });
  expect(beforeRemount).toBe(90);
  const disposed = await page.evaluate(() => {
    const app = document.querySelector<GameAppElement>("#app")!.__vue_app__,
      g = app._instance.exposed.game;
    app.unmount();
    return {
      disposed: g.life.disposed,
      counts: g.life.counts(),
      context: g.SND.ctx,
      nodes: g.TREE.nodes.length,
    };
  });
  expect(disposed).toEqual({
    disposed: true,
    counts: { timers: 0, frames: 0, intervals: 0, disposers: 0 },
    context: null,
    nodes: 0,
  });
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
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
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#introTitle")).toBeVisible();
  await page.locator("#btnNew").click();
  await page.locator('#regions [data-i="0"]').click();
  await page.locator("#rgAction").click();
  await page.locator("#trClose").click();
  expect(errors).toEqual([]);
});

test("phone-sized UI can inspect every track and preserves late-run canvas and audio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#btnNew").click();
  await page.locator('#sheetBody [data-i="0"]').click();
  await page.locator("#rgAction").click();
  await expect(page.locator("#trTracks button")).toHaveCount(4);
  await page.locator("#trView").click();
  for (const k of [0, 1, 2, 3]) {
    await page.locator(`#trTracks [data-k="${k}"]`).click();
    expect(await page.locator("#trList .card").count()).toBeGreaterThan(0);
  }
  await page.locator("#trView").click();
  await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.state.phase = 2;
    g.state.directive = "hunt";
    g.state.dprog = 91;
    g.state.alarm = 95;
    g.state.contain = 85;
    g.state.regions.forEach((r) => Object.assign(r, { a: 0.95, dc: true }));
    g.state.flags.drones = g.state.flags.airdeny = true;
    g.state.owned = [
      "h_silicon",
      "h_cool",
      "h_supply",
      "h_sub",
      "h_robo",
      "h_grid",
    ];
    g.artDirection();
    g.drawMap(performance.now());
  });
  await page.locator("#trClose").click();
  await expect(page.locator("#gDir")).toHaveClass(/past/);
  await expect(page.locator("#mapstat")).toContainText("Ascendant");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        return !!g.MUSIC.T.intro.buf && !!g.MUSIC.T.theme.buf;
      }),
    )
    .toBe(true);
  const audio = await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    return {
      intro: g.MUSIC.T.intro.buf!.duration,
      theme: g.MUSIC.T.theme.buf!.duration,
      loop: g.MUSIC.T.theme.loop,
      context: g.SND.ctx!.state,
    };
  });
  expect(audio.intro).toBeGreaterThan(20);
  expect(audio.theme).toBeGreaterThan(240);
  expect(audio.loop).toEqual([2.25, 240.25]);
  expect(audio.context).toBe("running");
  expect(errors).toEqual([]);
});
