import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import { openPausedRun } from "./a11y-helpers";

test("F22 closed phone sheets leave keyboard navigation and return focus to their tab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPausedRun(page);
  await expect(page.locator("#sheet")).toHaveAttribute("inert", "");
  await expect(page.locator("#sheet")).toHaveAttribute("aria-hidden", "true");
  await page.locator('[data-tab="world"]').click();
  await expect(page.locator("#sheet")).not.toHaveAttribute("inert", "");
  await expect(page.locator("#sheet")).not.toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await page.locator("#sheetClose").click();
  await expect(page.locator('[data-tab="world"]')).toBeFocused();
  await page.locator('[data-tab="log"]').focus();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      document.querySelector("#sheet")!.contains(document.activeElement),
    ),
  ).toBe(false);
  await page.locator('[data-tab="world"]').click();
  await page.locator('#sheetBody [data-i="0"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#regionModal")).toBeVisible();
  await page.locator("#rgClose").click();
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.ui.screenMode = "origin";
  });
  await page.locator('#sheetBody [data-i="0"]').click();
  await page.locator("#rgAction").click();
  await page.locator("#trClose").click();
  await expect(page.locator("#sheet")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#sheet")).toHaveAttribute("inert", "");
});

test("F22 breakpoint changes preserve visible desktop keyboard controls even with sheetOpen false", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (pageError) => pageErrors.push(pageError.message));
  await page.setViewportSize({ width: 899, height: 844 });
  await openPausedRun(page);
  await expect(page.locator("#sheet")).toHaveAttribute("inert", "");
  await page.setViewportSize({ width: 900, height: 844 });
  // Wait for the retained resize handler before deliberately closing its state.
  await expect(page.locator("#sheet")).toHaveClass(/open/);
  await page.evaluate(() =>
    document
      .querySelector<GameAppElement>("#app")!
      .__vue_app__._instance.exposed.game.closeDockPanel(),
  );
  await expect(page.locator("#sheet")).not.toHaveAttribute("inert", "");
  await expect(page.locator("#sheet")).not.toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await page.locator('[data-tab="log"]').focus();
  await page.keyboard.press("Tab");
  await expect(page.locator('#sheetBody [data-i="0"]')).toBeFocused();
  await page.setViewportSize({ width: 899, height: 844 });
  await expect(page.locator("#sheet")).toHaveAttribute("inert", "");
  await expect(page.locator("#sheet")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator('[data-tab="world"]')).toBeFocused();
  await page.setViewportSize({ width: 1200, height: 844 });
  await expect(page.locator("#sheet")).not.toHaveAttribute("inert", "");
  await page.evaluate(() =>
    document.querySelector<GameAppElement>("#app")!.__vue_app__.unmount(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(pageErrors).toEqual([]);
});
