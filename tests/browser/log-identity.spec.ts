import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";

test("prepended log entries preserve open details and keyboard focus identity", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const game =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    game.state.started = true;
    game.state.origin = "NA";
    game.state.paused = true;
    game.ui.mode = "play";
    game.openSheet("log");
    game.state.log = [];
    game.log("INCIDENT", "Older", "body", "out", "OLDER DETAILS");
    game.log("INCIDENT", "Newest", "body", "out", "NEWEST DETAILS");
  });
  const newest = page
    .locator("#sheetBody .le")
    .filter({ has: page.locator("b", { hasText: "Newest" }) });
  await newest.locator("summary").click();
  await expect(newest.locator("details")).toHaveAttribute("open", "");
  await expect(newest.locator("summary")).toBeFocused();
  await page.evaluate(() =>
    document
      .querySelector<GameAppElement>("#app")!
      .__vue_app__._instance.exposed.game.log(
        "INCIDENT",
        "Incoming",
        "body",
        "out",
        "INCOMING DETAILS",
      ),
  );
  await expect(newest.locator("details")).toHaveAttribute("open", "");
  await expect(newest.locator("summary")).toBeFocused();
  await expect(page.locator("#sheetBody details[open] p")).toHaveText(
    "NEWEST DETAILS",
  );
  await expect(
    page.locator("#sheetBody .le").first().locator("details"),
  ).not.toHaveAttribute("open", "");
  expect(
    await page.evaluate(() => {
      const log =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.state.log;
      return log.every((entry) => !Object.keys(entry).includes("id"));
    }),
  ).toBe(true);
});
