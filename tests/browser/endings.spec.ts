import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import { ENDING_DISPLAY_ORDER } from "../../src/data/catalog";

for (const endingKey of ENDING_DISPLAY_ORDER) {
  test(`ending ${endingKey} remains visible and can continue and restart`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate((endingKey) => {
      const migratedGame =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      migratedGame.state.started = true;
      migratedGame.state.origin = "NA";
      migratedGame.ui.screenMode = "play";
      migratedGame.state.ended = {
        kind: migratedGame.ENDING_DEFINITIONS[endingKey].kind,
        key: endingKey,
        dir: null,
        dprog: 100,
      };
      migratedGame.showEnding(false);
    }, endingKey);
    await expect(page.locator("#endModal")).toBeVisible();
    expect(
      await page.locator("#endModal").evaluate((endingElement) => {
        for (
          let ancestorElement: Element | null = endingElement;
          ancestorElement;
          ancestorElement = ancestorElement.parentElement
        ) {
          const ancestorStyle = getComputedStyle(ancestorElement);
          if (
            Number(ancestorStyle.opacity) === 0 ||
            ancestorStyle.pointerEvents === "none"
          )
            return false;
        }
        return true;
      }),
    ).toBe(true);
    await page.locator("#btnEndNext").click();
    await expect(page.locator("#endMore")).toBeVisible();
    await page.locator("#btnAgain").click();
    await expect(page.locator("#endModal")).toBeHidden();
    await expect(page.locator("body")).not.toHaveClass(/ending/);
    expect(
      await page.evaluate(
        () =>
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game.state.ended,
      ),
    ).toBeNull();
    await page.evaluate(() =>
      document.querySelector<GameAppElement>("#app")!.__vue_app__.unmount(),
    );
    await expect(page.locator("#endModal")).toHaveCount(0);
  });
}

test("normal-motion ending Skip remains clickable outside the halted shell", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.state.started = true;
    migratedGame.state.origin = "NA";
    migratedGame.ui.screenMode = "play";
    migratedGame.state.ended = {
      kind: "win",
      key: "battery",
      dir: "battery",
      dprog: 100,
    };
    migratedGame.showEnding(false);
  });
  await page.locator("#endSkip").click({ timeout: 2000 });
  await expect(page.locator("#endModal")).toBeVisible();
  await page.locator("#btnEndNext").click();
  await expect(page.locator("#endMore")).toBeVisible();
});
