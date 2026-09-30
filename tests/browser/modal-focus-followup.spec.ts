import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import { pausedRun, focusInside, tabStaysInside } from "./a11y-helpers";

test("F21 later-painted region keeps ownership when a briefing opens behind it", async ({
  page,
}) => {
  await pausedRun(page);
  const opener = page.locator('#sheetBody [data-i="0"]');
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#rgClose")).toBeFocused();
  await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.state.brief.news.push({
      kind: "HEADLINE",
      title: "Behind the region",
      out: "Queued news",
      u: false,
    });
    g.openBriefing();
  });
  await expect(page.locator("#eventModal")).toBeVisible();
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
    await page.locator("#rgClose").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return document
        .elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
        ?.closest(".overlay")?.id;
    }),
  ).toBe("regionModal");
  await tabStaysInside(page, "#regionModal [role=dialog]");
  await page.keyboard.press("Escape");
  await expect(page.locator("#regionModal")).toBeHidden();
  await expect(page.locator("#eventModal [role=dialog]")).toHaveAttribute(
    "aria-modal",
    "true",
  );
  await expect(page.locator("#eventModal")).not.toHaveAttribute("inert", "");
  await focusInside(page, "#eventModal [role=dialog]");
  await page.locator("#evContinue").click();
  await expect(page.locator("#eventModal")).toBeHidden();
  await expect(page.locator(".top")).not.toHaveAttribute("inert", "");
});

for (const key of ["Enter", "Space"] as const) {
  for (const initialGoal of [null, "a_img"] as const) {
    test(`F21 keyboard ${key} ${initialGoal ? "clear" : "set"} path restores the rebuilt list opener`, async ({
      page,
    }) => {
      await pausedRun(page);
      await page.locator('#tabs [data-tab="tree"]').click();
      await page.locator("#trView").click();
      await page.locator('#trTracks [data-k="1"]').click();
      await page.evaluate((goal) => {
        const g =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        g.setGoal(goal);
        g.renderTreeList(true);
      }, initialGoal);
      const opener = page.locator('#trList [data-id="a_img"]');
      await opener.focus();
      await page.keyboard.press(key);
      await expect(page.locator("#tcClose")).toBeFocused();
      await page.locator("#tcPath").focus();
      await page.keyboard.press(key);
      await expect(page.locator("#tcard")).toBeHidden();
      const goal = initialGoal ? null : "a_img";
      expect(
        await page.evaluate(
          () =>
            document.querySelector<GameAppElement>("#app")!.__vue_app__
              ._instance.exposed.game.state.goal,
        ),
      ).toBe(goal);
      await expect(opener).toBeFocused();
      if (goal) await expect(opener).toHaveClass(/\bpath\b/);
      else await expect(opener).not.toHaveClass(/\bpath\b/);
      await page.keyboard.press("Escape");
      await expect(page.locator('#tabs [data-tab="tree"]')).toBeFocused();
    });
  }
}

test("F21 inaccessible desktop World opener falls back to its phone tab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await pausedRun(page);
  await page.evaluate(() =>
    document
      .querySelector<GameAppElement>("#app")!
      .__vue_app__._instance.exposed.game.closeSheet(),
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
