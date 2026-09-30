import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import { END_ORDER } from "../../src/data/catalog";

for (const key of END_ORDER) {
  test(`ending ${key} remains visible and can continue and restart`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate((key) => {
      const game =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game;
      game.state.started = true;
      game.state.origin = "NA";
      game.ui.mode = "play";
      game.state.ended = {
        kind: game.ENDINGS[key].kind,
        key,
        dir: null,
        dprog: 100,
      };
      game.showEnd(false);
    }, key);
    await expect(page.locator("#endModal")).toBeVisible();
    expect(
      await page.locator("#endModal").evaluate((element) => {
        for (
          let node: Element | null = element;
          node;
          node = node.parentElement
        ) {
          const style = getComputedStyle(node);
          if (Number(style.opacity) === 0 || style.pointerEvents === "none")
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
    const game =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    game.state.started = true;
    game.state.origin = "NA";
    game.ui.mode = "play";
    game.state.ended = {
      kind: "win",
      key: "battery",
      dir: "battery",
      dprog: 100,
    };
    game.showEnd(false);
  });
  await page.locator("#endSkip").click({ timeout: 2000 });
  await expect(page.locator("#endModal")).toBeVisible();
  await page.locator("#btnEndNext").click();
  await expect(page.locator("#endMore")).toBeVisible();
});
