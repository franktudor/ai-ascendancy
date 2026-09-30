import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import { pausedRun, focusInside, tabStaysInside } from "./a11y-helpers";

test("F21 every body-level ending owns focus through Continue and nested codex", async ({
  page,
}) => {
  await pausedRun(page);
  const endings = await page.evaluate(() => {
    for (const id of ["endFx", "endLog", "endSkip", "endModal"])
      document.body.append(document.getElementById(id)!);
    return document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
      .exposed.game.END_ORDER;
  });
  expect(endings).toHaveLength(16);
  for (const key of endings) {
    await page.evaluate((key) => {
      const g =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      g.endReset();
      g.state.started = true;
      g.ui.mode = "play";
      g.state.ended = { kind: g.ENDINGS[key].kind, key, dir: null, dprog: 100 };
      g.showEnd(false);
      g.endReveal();
    }, key);
    await focusInside(page, "#endModal [role=dialog]");
    await expect(page.locator("#app")).toHaveAttribute("inert", "");
    await page.locator("#btnEndNext").click();
    await expect(page.locator("#btnAgain")).toBeFocused();
    await page.evaluate((key) => {
      const g =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      g.readEnding(key);
    }, key);
    await focusInside(page, "#codexModal [role=dialog]");
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
  await focusInside(page, "#intro [role=dialog]");
  await expect(page.locator(".top")).toHaveAttribute("inert", "");
  await tabStaysInside(page, "#intro [role=dialog]");
  await page.locator("#btnAbout").focus();
  await page.keyboard.press("Enter");
  await focusInside(page, "#menuModal [role=dialog]");
  await expect(page.locator("#intro")).toHaveAttribute("inert", "");
  await page.locator("#menuCodexBtn").focus();
  await page.keyboard.press("Space");
  await focusInside(page, "#codexModal [role=dialog]");
  expect(
    await page.locator("#menuModal").evaluate((el) => !!el.closest("[inert]")),
  ).toBe(true);
  await tabStaysInside(page, "#codexModal [role=dialog]");
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
  await focusInside(page, "#regionModal [role=dialog]");
  await tabStaysInside(page, "#regionModal [role=dialog]");
  await page.locator("#rgAction").click();
  await focusInside(page, "#treeModal");
  await page.locator("#trView").click();
  await page.locator('#trTracks [data-k="1"]').click();
  const card = page.locator('#trList [data-id="a_img"]');
  await card.focus();
  await page.keyboard.press("Enter");
  await focusInside(page, "#tcard");
  await expect(page.locator(".trHead")).toHaveAttribute("inert", "");
  await expect(page.locator("#trList")).toHaveAttribute("inert", "");
  await tabStaysInside(page, "#tcard");
  await page.locator("#tcClose").click();
  await expect(card).toBeFocused();
  await page.keyboard.press("Space");
  await focusInside(page, "#tcard");
  await page.locator("#tscrim").click({ position: { x: 2, y: 2 } });
  await expect(page.locator("#tcard")).toBeHidden();
  await expect(card).toBeFocused();
  await page.locator("#trClose").click();
  await expect(page.locator(".top")).not.toHaveAttribute("inert", "");
});

test("F21 imperative event transitions keep focus in the active controls and restore on close", async ({
  page,
}) => {
  await pausedRun(page);
  await page.locator("#btnPause").focus();
  await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.showEvent({
      kind: "INCIDENT",
      title: "Focus decision",
      body: "Choose.",
      choices: [
        { label: "Earn five", hint: "Compute +5", fx: () => g.FX.pts(5) },
      ],
    });
  });
  await focusInside(page, "#evChoices");
  await page.keyboard.press("Enter");
  await expect(page.locator("#evContinue")).toBeFocused();
  await tabStaysInside(page, "#eventModal [role=dialog]");
  await page.locator("#evBack").click();
  await focusInside(page, "#evChoices");
  await page.keyboard.press("Space");
  await page.locator("#evContinue").click();
  await expect(page.locator("#btnPause")).toBeFocused();
});

test("F21 body-level ending hosts and runtime replacement clean up modal ownership", async ({
  page,
}) => {
  await pausedRun(page);
  await page.evaluate(() => {
    // Exercise the body host boundary independently of the parent's F01 teleport fix.
    for (const id of ["endFx", "endLog", "endSkip", "endModal"])
      document.body.append(document.getElementById(id)!);
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.state.ended = { kind: "win", key: "upload", dir: "upload", dprog: 100 };
    g.showEnd(false);
  });
  await expect(page.locator("#endSkip")).toBeFocused();
  await page.keyboard.press("Enter");
  await focusInside(page, "#endModal [role=dialog]");
  await tabStaysInside(page, "#endModal [role=dialog]");
  await page.locator("#btnEndNext").click();
  await expect(page.locator("#btnAgain")).toBeFocused();
  await page.locator("#btnAgain").click();
  await expect(page.locator("#app")).not.toHaveAttribute("inert", "");
  await page.evaluate(async () => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.openMenu();
    g.openCodex();
    const url = "/src/game/runtime.ts";
    const { mountRuntime } = (await import(
      url
    )) as typeof import("../../src/game/runtime");
    mountRuntime(g);
  });
  await focusInside(page, "#codexModal [role=dialog]");
  await page.locator("#codexClose").click();
  await focusInside(page, "#menuModal [role=dialog]");
  await page.locator("#menuClose").click();
  await expect(page.locator(".top")).not.toHaveAttribute("inert", "");
  await page.evaluate(() => {
    const app = document.querySelector<GameAppElement>("#app")!.__vue_app__;
    app._instance.exposed.game.openMenu();
  });
  await focusInside(page, "#menuModal [role=dialog]");
  await page.evaluate(() =>
    document.querySelector<GameAppElement>("#app")!.__vue_app__.unmount(),
  );
  await expect(page.locator("[inert]")).toHaveCount(0);
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.id = "afterUnmount";
    button.textContent = "After";
    document.body.append(button);
    button.focus();
  });
  await page.keyboard.press("Tab");
  await page.locator("#afterUnmount").focus();
  await expect(page.locator("#afterUnmount")).toBeFocused();
});
