import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { GameAppElement } from "../../src/env";

export async function openPausedRun(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.state.started = true;
    migratedGame.state.origin = "NA";
    migratedGame.state.paused = true;
    migratedGame.ui.screenMode = "play";
  });
  await expect(page.locator("#intro")).toBeHidden();
}

export async function expectFocusInside(
  page: Page,
  focusContainerSelector: string,
): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        (focusContainerSelector) =>
          document
            .querySelector(focusContainerSelector)
            ?.contains(document.activeElement) ?? false,
        focusContainerSelector,
      ),
    )
    .toBe(true);
}

export async function expectTabNavigationStaysInside(
  page: Page,
  focusContainerSelector: string,
): Promise<void> {
  for (const navigationKey of [
    "Tab",
    "Shift+Tab",
    ...Array<string>(12).fill("Tab"),
  ]) {
    await page.keyboard.press(navigationKey);
    await expectFocusInside(page, focusContainerSelector);
  }
}
