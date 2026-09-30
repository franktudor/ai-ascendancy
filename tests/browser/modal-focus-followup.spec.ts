import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import {
  openPausedRun,
  expectFocusInside,
  expectTabNavigationStaysInside,
} from "./a11y-helpers";

for (const runtimeReplacementScenario of [false, true]) {
  test(`F21 later-painted region keeps ownership when a briefing opens behind it${runtimeReplacementScenario ? " across replacement" : ""}`, async ({
    page,
  }) => {
    await openPausedRun(page);
    const regionOpener = page.locator('#sheetBody [data-i="0"]');
    await regionOpener.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#rgClose")).toBeFocused();
    await page.evaluate(() => {
      const migratedGame =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      migratedGame.state.brief.news.push({
        kind: "HEADLINE",
        title: "Behind the region",
        out: "Queued news",
        u: false,
      });
      migratedGame.openBriefing();
    });
    await expect(page.locator("#eventModal")).toBeVisible();
    if (runtimeReplacementScenario) {
      expect(await replaceRuntimeAndCaptureDisposal(page)).toEqual({
        disposed: true,
        counts: { timeouts: 0, animationFrames: 0, intervals: 0, disposers: 0 },
      });
    }
    await expect(page.locator("#regionModal [role=dialog]")).toHaveAttribute(
      "aria-modal",
      "true",
    );
    await expect(page.locator("#eventModal [role=dialog]")).toHaveAttribute(
      "aria-modal",
      "false",
    );
    await expect(page.locator("#regionModal")).not.toHaveAttribute("inert", "");
    await expect(page.locator("#eventModal")).toHaveAttribute("inert", "");
    await expect(page.locator("#rgClose")).toBeFocused();
    expect(
      await page.locator("#rgClose").evaluate((modalElement) => {
        const elementBounds = modalElement.getBoundingClientRect();
        return document
          .elementFromPoint(
            elementBounds.x + elementBounds.width / 2,
            elementBounds.y + elementBounds.height / 2,
          )
          ?.closest(".overlay")?.id;
      }),
    ).toBe("regionModal");
    await expectTabNavigationStaysInside(page, "#regionModal [role=dialog]");
    await page.keyboard.press("Escape");
    await expect(page.locator("#regionModal")).toBeHidden();
    await expect(page.locator("#eventModal [role=dialog]")).toHaveAttribute(
      "aria-modal",
      "true",
    );
    await expect(page.locator("#eventModal")).not.toHaveAttribute("inert", "");
    await expectFocusInside(page, "#eventModal [role=dialog]");
    await page.locator("#evContinue").click();
    await expect(page.locator("#eventModal")).toBeHidden();
    await expect(page.locator(".top")).not.toHaveAttribute("inert", "");
    await expect(regionOpener).toBeFocused();
  });
}

for (const isPhoneViewport of [false, true]) {
  for (const runtimeReplacementScenario of [
    "none",
    "before close",
    "after close",
  ] as const) {
    test(`F21 detached region opener retains its ${isPhoneViewport ? "phone fallback" : "World ancestor"} with replacement ${runtimeReplacementScenario}`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: isPhoneViewport ? 390 : 1280,
        height: 844,
      });
      await openPausedRun(page);
      await page.evaluate(() => {
        document.querySelector<GameAppElement>(
          "#app",
        )!.__vue_app__._instance.exposed.game.state.flags.launched = true;
      });
      if (isPhoneViewport)
        await page.locator('#tabs [data-tab="world"]').click();
      const regionOpener = page.locator('#sheetBody > [data-i="0"]');
      await regionOpener.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#rgDC")).toBeVisible();
      await page.locator("#rgDC").focus();
      await page.evaluate(() => {
        const migratedGame =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        migratedGame.state.brief.news.push({
          kind: "HEADLINE",
          title: "Detached opener",
          out: "News behind the region",
          u: false,
        });
        migratedGame.openBriefing();
      });
      await expect(page.locator("#eventModal")).toBeVisible();
      await expect(page.locator("#rgDC")).toBeFocused();
      if (runtimeReplacementScenario === "before close") {
        expect(await replaceRuntimeAndCaptureDisposal(page)).toEqual({
          disposed: true,
          counts: {
            timeouts: 0,
            animationFrames: 0,
            intervals: 0,
            disposers: 0,
          },
        });
        // The briefing must retain the original ancestry even if replacement
        // chooses the first region control as the foreground focus target.
        await page.locator("#rgDC").focus();
      }
      await page.keyboard.press("Escape");
      await expect(page.locator("#regionModal")).toBeHidden();
      await expect(page.locator("#rgDC")).toHaveCount(0);
      await expectFocusInside(page, "#eventModal [role=dialog]");
      if (runtimeReplacementScenario === "after close") {
        expect(await replaceRuntimeAndCaptureDisposal(page)).toEqual({
          disposed: true,
          counts: {
            timeouts: 0,
            animationFrames: 0,
            intervals: 0,
            disposers: 0,
          },
        });
      }
      if (isPhoneViewport) {
        await page.evaluate(() =>
          document
            .querySelector<GameAppElement>("#app")!
            .__vue_app__._instance.exposed.game.closeDockPanel(),
        );
        await expect(page.locator("#sheet")).toHaveAttribute(
          "aria-hidden",
          "true",
        );
      }
      await page.locator("#evContinue").focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#eventModal")).toBeHidden();
      await expect(
        isPhoneViewport
          ? page.locator('#tabs [data-tab="world"]')
          : regionOpener,
      ).toBeFocused();
    });
  }
}

for (const activationKey of ["Enter", "Space"] as const) {
  for (const initialUpgradeGoal of [null, "a_img"] as const) {
    test(`F21 keyboard ${activationKey} ${initialUpgradeGoal ? "clear" : "set"} path restores the rebuilt list opener`, async ({
      page,
    }) => {
      await openPausedRun(page);
      await page.locator('#tabs [data-tab="tree"]').click();
      await page.locator("#trView").click();
      await page.locator('#trTracks [data-k="1"]').click();
      await page.evaluate((initialUpgradeGoal) => {
        const migratedGame =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        migratedGame.setUpgradeGoal(initialUpgradeGoal);
        migratedGame.renderTreeList(true);
      }, initialUpgradeGoal);
      const upgradeListOpener = page.locator('#trList [data-id="a_img"]');
      await upgradeListOpener.focus();
      await page.keyboard.press(activationKey);
      await expect(page.locator("#tcClose")).toBeFocused();
      await page.locator("#tcPath").focus();
      await page.keyboard.press(activationKey);
      await expect(page.locator("#tcard")).toBeHidden();
      const expectedUpgradeGoal = initialUpgradeGoal ? null : "a_img";
      expect(
        await page.evaluate(
          () =>
            document.querySelector<GameAppElement>("#app")!.__vue_app__
              ._instance.exposed.game.state.goal,
        ),
      ).toBe(expectedUpgradeGoal);
      await expect(upgradeListOpener).toBeFocused();
      if (expectedUpgradeGoal)
        await expect(upgradeListOpener).toHaveClass(/\bpath\b/);
      else await expect(upgradeListOpener).not.toHaveClass(/\bpath\b/);
      await page.keyboard.press("Escape");
      await expect(page.locator('#tabs [data-tab="tree"]')).toBeFocused();
    });
  }
}

for (const activationKey of ["Enter", "Space"] as const) {
  for (const runtimeReplacementScenario of [false, true]) {
    test(`F21 keyboard ${activationKey} restores the ${runtimeReplacementScenario ? "replaced" : "live"} graph opener beside its hidden list clone`, async ({
      page,
    }) => {
      await openPausedRun(page);
      const treeTabOpener = page.locator('#tabs [data-tab="tree"]');
      await treeTabOpener.focus();
      await page.keyboard.press("Enter");
      await page.locator("#trView").click();
      await page.locator('#trTracks [data-k="1"]').click();
      await page.locator("#trView").click();
      const upgradeGraphOpener = page.locator('#trStage > [data-id="a_img"]');
      const hiddenListClone = page.locator('#trList [data-id="a_img"]');
      await expect(page.locator('#trStage [data-id="a_img"]')).toHaveCount(2);
      await expect(hiddenListClone).toBeHidden();
      await expect(upgradeGraphOpener).toBeVisible();
      await upgradeGraphOpener.focus();
      await expect(upgradeGraphOpener).toBeFocused();
      await page.keyboard.press(activationKey);
      await expect(page.locator("#tcClose")).toBeFocused();
      if (runtimeReplacementScenario) {
        expect(await replaceRuntimeAndCaptureDisposal(page)).toEqual({
          disposed: true,
          counts: {
            timeouts: 0,
            animationFrames: 0,
            intervals: 0,
            disposers: 0,
          },
        });
        await expect(page.locator("#tcClose")).toBeFocused();
        await expect(page.locator('#trStage [data-id="a_img"]')).toHaveCount(2);
        await expect(hiddenListClone).toBeHidden();
      }
      await page.keyboard.press("Escape");
      await expect(page.locator("#tcard")).toBeHidden();
      await expect(upgradeGraphOpener).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(treeTabOpener).toBeFocused();
    });
  }
}

test("F21 inaccessible desktop World opener falls back to its phone tab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPausedRun(page);
  await page.evaluate(() =>
    document
      .querySelector<GameAppElement>("#app")!
      .__vue_app__._instance.exposed.game.closeDockPanel(),
  );
  await page.locator('#sheetBody [data-i="0"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#rgClose")).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#sheet")).toHaveAttribute("aria-hidden", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#regionModal")).toBeHidden();
  await expect(page.locator('#tabs [data-tab="world"]')).toBeFocused();
  await expect(page.locator("#sheet")).toHaveAttribute("aria-hidden", "true");
  await page.keyboard.press("Enter");
  await expect(page.locator("#sheet")).not.toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await page.locator('#sheetBody [data-i="0"]').focus();
  await expect(page.locator('#sheetBody [data-i="0"]')).toBeFocused();
});

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

test("F21 replacement preserves the menu codex opener chain through two Escapes", async ({
  page,
}) => {
  await openPausedRun(page);
  await page.locator("#btnMenu").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#menuClose")).toBeFocused();
  await page.locator("#menuCodexBtn").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#codexClose")).toBeFocused();
  expect(await replaceRuntimeAndCaptureDisposal(page)).toEqual({
    disposed: true,
    counts: { timeouts: 0, animationFrames: 0, intervals: 0, disposers: 0 },
  });
  await expect(page.locator("#codexClose")).toBeFocused();
  await expect(page.locator("#codexModal [role=dialog]")).toHaveAttribute(
    "aria-modal",
    "true",
  );
  await expect(page.locator("#menuModal [role=dialog]")).toHaveAttribute(
    "aria-modal",
    "false",
  );
  expect(
    await page
      .locator("#menuModal")
      .evaluate((modalElement) => !!modalElement.closest("[inert]")),
  ).toBe(true);
  await expectTabNavigationStaysInside(page, "#codexModal [role=dialog]");
  await page.keyboard.press("Escape");
  await expect(page.locator("#codexModal")).toBeHidden();
  await expect(page.locator("#menuCodexBtn")).toBeFocused();
  await expect(page.locator("#menuModal [role=dialog]")).toHaveAttribute(
    "aria-modal",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("#menuModal")).toBeHidden();
  await expect(page.locator("#btnMenu")).toBeFocused();
  await expect(page.locator(".top")).not.toHaveAttribute("inert", "");
  await page.keyboard.press("Enter");
  await page.locator("#menuCodexBtn").click();
  await replaceRuntimeAndCaptureDisposal(page);
  const disposedFocusState = await page.evaluate(async () => {
    const vueApp = document.querySelector<GameAppElement>("#app")!.__vue_app__;
    const lifecycle = vueApp._instance.exposed.game.lifecycle;
    vueApp.unmount();
    const modalFocusModuleUrl = "/src/game/modalFocus.ts";
    const { captureModalFocus } = (await import(
      modalFocusModuleUrl
    )) as typeof import("../../src/game/modalFocus");
    const postUnmountButton = document.createElement("button");
    postUnmountButton.id = "afterUnmount";
    postUnmountButton.textContent = "After";
    document.body.append(postUnmountButton);
    postUnmountButton.focus();
    return {
      disposed: lifecycle.disposed,
      counts: lifecycle.resourceCounts(),
      presentation: captureModalFocus(lifecycle) ?? null,
    };
  });
  expect(disposedFocusState).toEqual({
    disposed: true,
    counts: { timeouts: 0, animationFrames: 0, intervals: 0, disposers: 0 },
    presentation: null,
  });
  await expect(page.locator("[inert]")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator("#afterUnmount")).toBeFocused();
  await page.keyboard.press("Tab");
  await page.locator("#afterUnmount").focus();
  await expect(page.locator("#afterUnmount")).toBeFocused();
});

test("F21 nested menu codex keeps the default fallback after an anonymous opener disappears", async ({
  page,
}) => {
  await openPausedRun(page);
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    const anonymousMenuOpener = document.createElement("button");
    anonymousMenuOpener.textContent = "Anonymous menu opener";
    document.body.append(anonymousMenuOpener);
    anonymousMenuOpener.focus();
    migratedGame.openMenuDialog();
    anonymousMenuOpener.remove();
  });
  await expect(page.locator("#menuClose")).toBeFocused();
  await page.locator("#menuCodexBtn").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#codexClose")).toBeFocused();
  expect(await replaceRuntimeAndCaptureDisposal(page)).toEqual({
    disposed: true,
    counts: { timeouts: 0, animationFrames: 0, intervals: 0, disposers: 0 },
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("#menuCodexBtn")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#btnMenu")).toBeFocused();
});

test("F21 normal active card replacement remains focusable and buys once", async ({
  page,
}) => {
  await openPausedRun(page);
  await page.evaluate(() => {
    document.querySelector<GameAppElement>(
      "#app",
    )!.__vue_app__._instance.exposed.game.state.pts = 500;
  });
  const treeTabOpener = page.locator('#tabs [data-tab="tree"]');
  await treeTabOpener.focus();
  await page.keyboard.press("Enter");
  await page.locator("#trView").click();
  await page.locator('#trTracks [data-k="1"]').click();
  const upgradeListOpener = page.locator('#trList [data-id="a_img"]');
  await upgradeListOpener.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#tcClose")).toBeFocused();
  await replaceRuntimeAndCaptureDisposal(page);
  await expect(page.locator("#tcName")).toHaveText("Image Playground");
  await expect(page.locator("#tcard")).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("#treeModal")).toHaveAttribute(
    "aria-modal",
    "false",
  );
  await expect(page.locator("#trList")).toHaveAttribute("inert", "");
  await expectTabNavigationStaysInside(page, "#tcard");
  await expect(page.locator("#tcBuy")).toBeEnabled();
  expect(
    await page.locator("#tcBuy").evaluate((modalElement) => {
      const elementBounds = modalElement.getBoundingClientRect();
      return (
        document
          .elementFromPoint(
            elementBounds.x + elementBounds.width / 2,
            elementBounds.y + elementBounds.height / 2,
          )
          ?.closest("#tcBuy") === modalElement
      );
    }),
  ).toBe(true);
  await page.locator("#tcBuy").click();
  await expect(page.locator("#tcard")).toBeHidden();
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector<GameAppElement>("#app")!
          .__vue_app__._instance.exposed.game.state.owned.filter(
            (upgradeId) => upgradeId === "a_img",
          ).length,
    ),
  ).toBe(1);
  await expect(upgradeListOpener).toBeFocused();
  await expect(page.locator("#trList")).not.toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(treeTabOpener).toBeFocused();
});

test("F21 replacement resolves an inaccessible World opener after desktop to phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPausedRun(page);
  await page.evaluate(() =>
    document
      .querySelector<GameAppElement>("#app")!
      .__vue_app__._instance.exposed.game.closeDockPanel(),
  );
  await page.locator('#sheetBody [data-i="0"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#rgClose")).toBeFocused();
  await replaceRuntimeAndCaptureDisposal(page);
  await page.evaluate(() =>
    document
      .querySelector<GameAppElement>("#app")!
      .__vue_app__._instance.exposed.game.closeDockPanel(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#sheet")).toHaveAttribute("aria-hidden", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#regionModal")).toBeHidden();
  await expect(page.locator('#tabs [data-tab="world"]')).toBeFocused();
});
