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
