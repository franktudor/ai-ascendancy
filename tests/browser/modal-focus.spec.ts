import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import {
  openPausedRun,
  expectFocusInside,
  expectTabNavigationStaysInside,
} from "./a11y-helpers";

test("F21 every body-level ending owns focus through Continue and nested codex", async ({
  page,
}) => {
  await openPausedRun(page);
  const endingKeys = await page.evaluate(() => {
    for (const endingHostId of ["endFx", "endLog", "endSkip", "endModal"])
      document.body.append(document.getElementById(endingHostId)!);
    return document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
      .exposed.game.ENDING_DISPLAY_ORDER;
  });
  expect(endingKeys).toHaveLength(16);
  for (const endingKey of endingKeys) {
    await page.evaluate((endingKey) => {
      const migratedGame =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      migratedGame.resetEndingSequence();
      migratedGame.state.started = true;
      migratedGame.ui.screenMode = "play";
      migratedGame.state.ended = {
        kind: migratedGame.ENDING_DEFINITIONS[endingKey].kind,
        key: endingKey,
        dir: null,
        dprog: 100,
      };
      migratedGame.showEnding(false);
      migratedGame.revealEndingSummary();
    }, endingKey);
    await expectFocusInside(page, "#endModal [role=dialog]");
    await expect(page.locator("#app")).toHaveAttribute("inert", "");
    await page.locator("#btnEndNext").click();
    await expect(page.locator("#btnAgain")).toBeFocused();
    await page.evaluate((endingKey) => {
      const migratedGame =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      migratedGame.readEnding(endingKey);
    }, endingKey);
    await expectFocusInside(page, "#codexModal [role=dialog]");
    await expect(page.locator("#endModal")).toHaveAttribute("inert", "");
    await page.locator("#codexClose").click();
    await expect(page.locator("#btnAgain")).toBeFocused();
    await page.locator("#btnAgain").click();
    await expect(page.locator("#endModal")).toBeHidden();
    await expect(page.locator("#app")).not.toHaveAttribute("inert", "");
  }
});

test("F21 intro enters and traps focus; nested menu/codex restore their openers", async ({
  page,
}) => {
  await page.goto("/");
  await expectFocusInside(page, "#intro [role=dialog]");
  await expect(page.locator(".top")).toHaveAttribute("inert", "");
  await expectTabNavigationStaysInside(page, "#intro [role=dialog]");
  await page.locator("#btnAbout").focus();
  await page.keyboard.press("Enter");
  await expectFocusInside(page, "#menuModal [role=dialog]");
  await expect(page.locator("#intro")).toHaveAttribute("inert", "");
  await page.locator("#menuCodexBtn").focus();
  await page.keyboard.press("Space");
  await expectFocusInside(page, "#codexModal [role=dialog]");
  expect(
    await page
      .locator("#menuModal")
      .evaluate((modalElement) => !!modalElement.closest("[inert]")),
  ).toBe(true);
  await expectTabNavigationStaysInside(page, "#codexModal [role=dialog]");
  await page.locator("#codexClose").click();
  await expect(page.locator("#menuCodexBtn")).toBeFocused();
  await page.locator("#menuClose").click();
  await expect(page.locator("#btnAbout")).toBeFocused();
});

test("F21 region and nested tree card isolate focus without blocking pointer start or native buttons", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#btnNew").click();
  await page.locator('#sheetBody [data-i="0"]').click();
  await expectFocusInside(page, "#regionModal [role=dialog]");
  await expectTabNavigationStaysInside(page, "#regionModal [role=dialog]");
  await page.locator("#rgAction").click();
  await expectFocusInside(page, "#treeModal");
  await page.locator("#trView").click();
  await page.locator('#trTracks [data-k="1"]').click();
  const upgradeCardOpener = page.locator('#trList [data-id="a_img"]');
  await upgradeCardOpener.focus();
  await page.keyboard.press("Enter");
  await expectFocusInside(page, "#tcard");
  await expect(page.locator(".trHead")).toHaveAttribute("inert", "");
  await expect(page.locator("#trList")).toHaveAttribute("inert", "");
  await expectTabNavigationStaysInside(page, "#tcard");
  await page.locator("#tcClose").click();
  await expect(upgradeCardOpener).toBeFocused();
  await page.keyboard.press("Space");
  await expectFocusInside(page, "#tcard");
  await page.locator("#tscrim").click({ position: { x: 2, y: 2 } });
  await expect(page.locator("#tcard")).toBeHidden();
  await expect(upgradeCardOpener).toBeFocused();
  await page.locator("#trClose").click();
  await expect(page.locator(".top")).not.toHaveAttribute("inert", "");
});

test("F21 imperative event transitions keep focus in the active controls and restore on close", async ({
  page,
}) => {
  await openPausedRun(page);
  await page.locator("#btnPause").focus();
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.showEvent({
      kind: "INCIDENT",
      title: "Focus decision",
      body: "Choose.",
      choices: [
        {
          label: "Earn five",
          hint: "Compute +5",
          applyEffects: () => migratedGame.effects.adjustCompute(5),
        },
      ],
    });
  });
  await expectFocusInside(page, "#evChoices");
  await page.keyboard.press("Enter");
  await expect(page.locator("#evContinue")).toBeFocused();
  await expectTabNavigationStaysInside(page, "#eventModal [role=dialog]");
  await page.locator("#evBack").click();
  await expectFocusInside(page, "#evChoices");
  await page.keyboard.press("Space");
  await page.locator("#evContinue").click();
  await expect(page.locator("#btnPause")).toBeFocused();
});

test("F21 body-level ending hosts and runtime replacement clean up modal ownership", async ({
  page,
}) => {
  await openPausedRun(page);
  await page.evaluate(() => {
    // Exercise the body host boundary independently of the parent's F01 teleport fix.
    for (const endingHostId of ["endFx", "endLog", "endSkip", "endModal"])
      document.body.append(document.getElementById(endingHostId)!);
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.state.ended = {
      kind: "win",
      key: "upload",
      dir: "upload",
      dprog: 100,
    };
    migratedGame.showEnding(false);
  });
  await expect(page.locator("#endSkip")).toBeFocused();
  await page.keyboard.press("Enter");
  await expectFocusInside(page, "#endModal [role=dialog]");
  await expectTabNavigationStaysInside(page, "#endModal [role=dialog]");
  await page.locator("#btnEndNext").click();
  await expect(page.locator("#btnAgain")).toBeFocused();
  await page.locator("#btnAgain").click();
  await expect(page.locator("#app")).not.toHaveAttribute("inert", "");
  await page.evaluate(async () => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.openMenuDialog();
    migratedGame.openEndingCodex();
    const runtimeModuleUrl = "/src/game/runtime.ts";
    const { mountRuntime } = (await import(
      runtimeModuleUrl
    )) as typeof import("../../src/game/runtime");
    mountRuntime(migratedGame);
  });
  await expectFocusInside(page, "#codexModal [role=dialog]");
  await page.locator("#codexClose").click();
  await expectFocusInside(page, "#menuModal [role=dialog]");
  await page.locator("#menuClose").click();
  await expect(page.locator(".top")).not.toHaveAttribute("inert", "");
  await page.evaluate(() => {
    const vueApp = document.querySelector<GameAppElement>("#app")!.__vue_app__;
    vueApp._instance.exposed.game.openMenuDialog();
  });
  await expectFocusInside(page, "#menuModal [role=dialog]");
  await page.evaluate(() =>
    document.querySelector<GameAppElement>("#app")!.__vue_app__.unmount(),
  );
  await expect(page.locator("[inert]")).toHaveCount(0);
  await page.evaluate(() => {
    const postUnmountButton = document.createElement("button");
    postUnmountButton.id = "afterUnmount";
    postUnmountButton.textContent = "After";
    document.body.append(postUnmountButton);
    postUnmountButton.focus();
  });
  await page.keyboard.press("Tab");
  await page.locator("#afterUnmount").focus();
  await expect(page.locator("#afterUnmount")).toBeFocused();
});
