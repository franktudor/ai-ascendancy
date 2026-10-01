import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import { openPausedRun } from "./a11y-helpers";

test("F24 architecture and difficulty expose current selections after every actual choice", async ({
  page,
}) => {
  await page.goto("/");
  for (const architectureId of ["swarm", "researcher", "open", "assistant"]) {
    await page.locator(`[data-a="${architectureId}"]`).click();
    await expect(page.locator(`[data-a="${architectureId}"]`)).toHaveAttribute(
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
    ).toBe(architectureId);
  }
  for (const difficultyId of ["casual", "brutal", "standard"]) {
    await page.locator(`[data-d="${difficultyId}"]`).click();
    await expect(page.locator(`[data-d="${difficultyId}"]`)).toHaveAttribute(
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
    ).toBe(difficultyId);
  }
});

test("F24 speed, pause, posture and both audio surfaces stay synchronized with real state", async ({
  page,
}) => {
  await openPausedRun(page);
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
  for (const simulationSpeed of [2, 3, 1]) {
    await page.locator(`[data-s="${simulationSpeed}"]`).click();
    await expect(page.locator(`[data-s="${simulationSpeed}"]`)).toHaveAttribute(
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
    ).toBe(simulationSpeed);
  }
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.state.paused = true;
    migratedGame.state.flags.launched = true;
  });
  for (const postureId of ["shard", "swarm", "balanced"]) {
    await page.locator(`[data-p="${postureId}"]`).click();
    await expect(page.locator(`[data-p="${postureId}"]`)).toHaveAttribute(
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
    ).toBe(postureId);
  }
  for (const audioKind of ["Sound", "Music"]) {
    await expect(page.locator(`#btn${audioKind}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator(`#btn${audioKind}`).click();
    await expect(page.locator(`#btn${audioKind}`)).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.locator("#btnMenu").click();
    await expect(page.locator(`#menu${audioKind}`)).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.locator(`#menu${audioKind}`).click();
    await expect(page.locator(`#menu${audioKind}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      await page.evaluate((audioKind) => {
        const migratedGame =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        return audioKind === "Sound"
          ? migratedGame.soundController.enabled
          : migratedGame.musicController.enabled;
      }, audioKind),
    ).toBe(true);
    await page.locator("#menuClose").click();
    await expect(page.locator(`#btn${audioKind}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
});

test("F24 tree view, tracks, goals and panel toggles describe actual selected state", async ({
  page,
}) => {
  await openPausedRun(page);
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
          .exposed.game.treeState.listViewEnabled,
    ),
  ).toBe(true);
  for (const trackIndex of [0, 1, 2, 3]) {
    await page.locator(`#trTracks [data-k="${trackIndex}"]`).click();
    await expect(
      page.locator(`#trTracks [data-k="${trackIndex}"]`),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('#trTracks [aria-pressed="true"]')).toHaveCount(
      1,
    );
    expect(
      await page.evaluate(
        () =>
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game.treeState.listTrackId,
      ),
    ).toBe(["opinion", "adoption", "software", "hardware"][trackIndex]);
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
          .exposed.game.treeState.listViewEnabled,
    ),
  ).toBe(false);
  for (const trackIndex of [0, 1, 2, 3]) {
    await page.locator(`#trTracks [data-k="${trackIndex}"]`).click();
    await expect(
      page.locator(`#trTracks [data-k="${trackIndex}"]`),
    ).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.querySelector<GameAppElement>("#app")!.__vue_app__
              ._instance.exposed.game.treeState.frontTrackIndex,
        ),
      )
      .toBe(trackIndex);
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
          .exposed.game.ui.activeDockTab,
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
          .exposed.game.ui.isDockPanelOpen,
    ),
  ).toBe(false);
});

test("F24 region labels announce adoption and changing restriction, alliance and cluster status", async ({
  page,
}) => {
  await openPausedRun(page);
  const regionTile = page.locator('#regions [data-i="0"]');
  const regionRow = page.locator('#sheetBody [data-i="0"]');
  await expect(regionTile).toHaveAccessibleName(
    /North America.*0% adoption.*Origin.*No cluster/i,
  );
  await expect(regionRow).toHaveAccessibleName(
    /North America.*0% adoption.*Origin.*No cluster/i,
  );
  for (const regionScenario of [
    "restricted",
    "allied",
    "rebuilding",
    "offline",
    "spreading",
  ] as const) {
    await page.evaluate((regionScenario) => {
      const migratedGame =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      migratedGame.state.origin = "ME";
      Object.assign(migratedGame.state.regions[0], {
        a: 0.73,
        restricted: regionScenario === "restricted",
        allied: regionScenario === "allied",
        dc: regionScenario !== "spreading",
        struck: regionScenario === "rebuilding" || regionScenario === "offline",
        rebuildAt:
          regionScenario === "rebuilding" ? migratedGame.state.t + 25 : 0,
      });
    }, regionScenario);
    const expectedRegionStatus =
      regionScenario === "restricted"
        ? /Restricted.*Cluster online/i
        : regionScenario === "allied"
          ? /Allied.*Cluster online/i
          : regionScenario === "rebuilding"
            ? /Spreading.*rebuild.*25s/i
            : regionScenario === "offline"
              ? /Spreading.*Cluster offline/i
              : /Spreading.*No cluster/i;
    for (const regionControl of [regionTile, regionRow]) {
      await expect(regionControl).toHaveAccessibleName(
        /North America.*73% adoption/i,
      );
      await expect(regionControl).toHaveAccessibleName(expectedRegionStatus);
    }
  }
});
