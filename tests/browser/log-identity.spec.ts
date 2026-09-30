import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";

test("prepended log entries preserve open details and keyboard focus identity", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    migratedGame.state.started = true;
    migratedGame.state.origin = "NA";
    migratedGame.state.paused = true;
    migratedGame.ui.screenMode = "play";
    migratedGame.openDockPanel("log");
    migratedGame.state.log = [];
    migratedGame.appendRunLog(
      "INCIDENT",
      "Older",
      "body",
      "out",
      "OLDER DETAILS",
    );
    migratedGame.appendRunLog(
      "INCIDENT",
      "Newest",
      "body",
      "out",
      "NEWEST DETAILS",
    );
  });
  const newestLogEntry = page
    .locator("#sheetBody .le")
    .filter({ has: page.locator("b", { hasText: "Newest" }) });
  await newestLogEntry.locator("summary").click();
  await expect(newestLogEntry.locator("details")).toHaveAttribute("open", "");
  await expect(newestLogEntry.locator("summary")).toBeFocused();
  await page.evaluate(() =>
    document
      .querySelector<GameAppElement>("#app")!
      .__vue_app__._instance.exposed.game.appendRunLog(
        "INCIDENT",
        "Incoming",
        "body",
        "out",
        "INCOMING DETAILS",
      ),
  );
  await expect(newestLogEntry.locator("details")).toHaveAttribute("open", "");
  await expect(newestLogEntry.locator("summary")).toBeFocused();
  await expect(page.locator("#sheetBody details[open] p")).toHaveText(
    "NEWEST DETAILS",
  );
  await expect(
    page.locator("#sheetBody .le").first().locator("details"),
  ).not.toHaveAttribute("open", "");
  expect(
    await page.evaluate(() => {
      const logEntries =
        document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
          .exposed.game.state.log;
      return logEntries.every(
        (logEntry) => !Object.keys(logEntry).includes("id"),
      );
    }),
  ).toBe(true);
});
