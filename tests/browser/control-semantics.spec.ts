import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import { pausedRun } from "./a11y-helpers";

test("F24 architecture and difficulty expose current selections after every actual choice", async ({
  page,
}) => {
  await page.goto("/");
  for (const arch of ["swarm", "researcher", "open", "assistant"]) {
    await page.locator(`[data-a="${arch}"]`).click();
    await expect(page.locator(`[data-a="${arch}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator('#archSel [aria-pressed="true"]')).toHaveCount(1);
    expect(
      await page.evaluate(
        () =>
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game.state.arch,
      ),
    ).toBe(arch);
  }
  for (const diff of ["casual", "brutal", "standard"]) {
    await page.locator(`[data-d="${diff}"]`).click();
    await expect(page.locator(`[data-d="${diff}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator('#diffSeg [aria-pressed="true"]')).toHaveCount(1);
    expect(
      await page.evaluate(
        () =>
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game.state.diff,
      ),
    ).toBe(diff);
  }
});

test("F24 speed, pause, posture and both audio surfaces stay synchronized with real state", async ({
  page,
}) => {
  await pausedRun(page);
  await expect(page.locator("#btnPause")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#btnPause").click();
  await expect(page.locator("#btnPause")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect(
    await page.evaluate(
      () =>
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.state.paused,
    ),
  ).toBe(false);
  for (const speed of [2, 3, 1]) {
    await page.locator(`[data-s="${speed}"]`).click();
    await expect(page.locator(`[data-s="${speed}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator('#speed [aria-pressed="true"]')).toHaveCount(1);
    expect(
      await page.evaluate(
        () =>
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game.state.speed,
      ),
    ).toBe(speed);
  }
  await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.state.paused = true;
    g.state.flags.launched = true;
  });
  for (const posture of ["shard", "swarm", "balanced"]) {
    await page.locator(`[data-p="${posture}"]`).click();
    await expect(page.locator(`[data-p="${posture}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator('#posture [aria-pressed="true"]')).toHaveCount(1);
    expect(
      await page.evaluate(
        () =>
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game.state.posture,
      ),
    ).toBe(posture);
  }
  for (const kind of ["Sound", "Music"]) {
    await expect(page.locator(`#btn${kind}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator(`#btn${kind}`).click();
    await expect(page.locator(`#btn${kind}`)).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.locator("#btnMenu").click();
    await expect(page.locator(`#menu${kind}`)).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.locator(`#menu${kind}`).click();
    await expect(page.locator(`#menu${kind}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      await page.evaluate((kind) => {
        const g =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        return kind === "Sound" ? g.SND.on : g.MUSIC.on;
      }, kind),
    ).toBe(true);
    await page.locator("#menuClose").click();
    await expect(page.locator(`#btn${kind}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
});

test("F24 tree view, tracks, goals and panel toggles describe actual selected state", async ({
  page,
}) => {
  await pausedRun(page);
  await page.locator('[data-tab="tree"]').click();
  await expect(page.locator('[data-tab="tree"]')).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.locator("#trView")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.locator("#trView").click();
  await expect(page.locator("#trView")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#trView")).toHaveAccessibleName("List view");
  expect(
    await page.evaluate(
      () =>
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.TREE.list,
    ),
  ).toBe(true);
  for (const k of [0, 1, 2, 3]) {
    await page.locator(`#trTracks [data-k="${k}"]`).click();
    await expect(page.locator(`#trTracks [data-k="${k}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator('#trTracks [aria-pressed="true"]')).toHaveCount(
      1,
    );
    expect(
      await page.evaluate(
        () =>
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game.TREE.listTrack,
      ),
    ).toBe(["opinion", "adoption", "software", "hardware"][k]);
  }
  await page.locator('#trTracks [data-k="1"]').click();
  await page.locator('#trList [data-id="a_img"]').click();
  await expect(page.locator("#tcPath")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.locator("#tcPath").click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game.state.goal,
      ),
    )
    .toBe("a_img");
  await page.locator('#trList [data-id="a_img"]').click();
  await expect(page.locator("#tcPath")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#tcPath")).toHaveAccessibleName(
    "Trace path to " + (await page.locator("#tcName").textContent()),
  );
  await page.locator("#tcClose").click();
  await page.locator("#trGoalBtn").click();
  await page.locator('#trGoalMenu [data-v="d_upload"]').click();
  expect(
    await page.evaluate(
      () =>
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.state.goal,
    ),
  ).toBe("d_upload");
  await page.locator("#trGoalBtn").click();
  await expect(page.locator('#trGoalMenu [data-v="d_upload"]')).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Escape");
  await page.locator("#trView").click();
  await expect(page.locator("#trView")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect(
    await page.evaluate(
      () =>
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.TREE.list,
    ),
  ).toBe(false);
  for (const k of [0, 1, 2, 3]) {
    await page.locator(`#trTracks [data-k="${k}"]`).click();
    await expect(page.locator(`#trTracks [data-k="${k}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.querySelector<GameAppElement>("#app")!.__vue_app__
              ._instance.exposed.game.TREE.front,
        ),
      )
      .toBe(k);
  }
  await page.locator("#trClose").click();
  await expect(page.locator('[data-tab="tree"]')).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-tab="log"]').click();
  expect(
    await page.evaluate(
      () =>
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.ui.tab,
    ),
  ).toBe("log");
  await expect(page.locator('[data-tab="log"]')).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.locator('[data-tab="world"]')).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.locator("#sheetClose").click();
  await expect(page.locator('[data-tab="log"]')).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  expect(
    await page.evaluate(
      () =>
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.ui.sheetOpen,
    ),
  ).toBe(false);
});

test("F24 region labels announce adoption and changing restriction, alliance and cluster status", async ({
  page,
}) => {
  await pausedRun(page);
  const tile = page.locator('#regions [data-i="0"]');
  const row = page.locator('#sheetBody [data-i="0"]');
  await expect(tile).toHaveAccessibleName(
    /North America.*0% adoption.*Origin.*No cluster/i,
  );
  await expect(row).toHaveAccessibleName(
    /North America.*0% adoption.*Origin.*No cluster/i,
  );
  for (const state of [
    "restricted",
    "allied",
    "rebuilding",
    "offline",
    "spreading",
  ] as const) {
    await page.evaluate((state) => {
      const g =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      g.state.origin = "ME";
      Object.assign(g.state.regions[0], {
        a: 0.73,
        restricted: state === "restricted",
        allied: state === "allied",
        dc: state !== "spreading",
        struck: state === "rebuilding" || state === "offline",
        rebuildAt: state === "rebuilding" ? g.state.t + 25 : 0,
      });
    }, state);
    const status =
      state === "restricted"
        ? /Restricted.*Cluster online/i
        : state === "allied"
          ? /Allied.*Cluster online/i
          : state === "rebuilding"
            ? /Spreading.*rebuild.*25s/i
            : state === "offline"
              ? /Spreading.*Cluster offline/i
              : /Spreading.*No cluster/i;
    for (const region of [tile, row]) {
      await expect(region).toHaveAccessibleName(/North America.*73% adoption/i);
      await expect(region).toHaveAccessibleName(status);
    }
  }
});
