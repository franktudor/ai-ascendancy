import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { GameAppElement } from "../../src/env";

export async function pausedRun(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => {
    const game =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    game.state.started = true;
    game.state.origin = "NA";
    game.state.paused = true;
    game.ui.mode = "play";
  });
  await expect(page.locator("#intro")).toBeHidden();
}

export async function focusInside(page: Page, selector: string): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        (selector) =>
          document.querySelector(selector)?.contains(document.activeElement) ??
          false,
        selector,
      ),
    )
    .toBe(true);
}

export async function tabStaysInside(
  page: Page,
  selector: string,
): Promise<void> {
  for (const key of ["Tab", "Shift+Tab", ...Array<string>(12).fill("Tab")]) {
    await page.keyboard.press(key);
    await focusInside(page, selector);
  }
}
