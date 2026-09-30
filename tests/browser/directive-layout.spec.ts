import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import { openPausedRun } from "./a11y-helpers";

test("F23 all nine late-stage directive gauges fit every supported narrow breakpoint", async ({
  page,
}) => {
  await openPausedRun(page);
  const directiveIds = await page.evaluate(() => {
    const migratedGame =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    return migratedGame.UPGRADE_DEFINITIONS.flatMap((upgradeDefinition) =>
      upgradeDefinition.directiveId ? [upgradeDefinition.directiveId] : [],
    );
  });
  expect(new Set(directiveIds).size).toBe(9);
  const overflowReports: string[] = [];
  for (const viewportWidth of [320, 360, 390, 899, 900]) {
    await page.setViewportSize({ width: viewportWidth, height: 844 });
    for (const directiveId of directiveIds) {
      await page.evaluate((directiveId) => {
        const migratedGame =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        Object.assign(migratedGame.state, {
          phase: 2,
          directive: directiveId,
          dprog: 91,
          pts: 99999999,
          inst: 99999999,
          alarm: 95,
          contain: 85,
        });
        migratedGame.state.flags.launched = true;
        migratedGame.state.flags.computeCap = true;
        migratedGame.state.temp.brownout = migratedGame.state.t + 100;
        migratedGame.state.regions.forEach((regionState) =>
          Object.assign(regionState, { a: 0.95, dc: true }),
        );
      }, directiveId);
      await expect(page.locator("#dirV")).toHaveText("91% · past the line");
      await expect(page.locator("#rate")).toContainText("brownout · capped");
      await page.evaluate(() => document.fonts.ready);
      const scenarioOverflowLabels = await page.evaluate(() => {
        const overflowLabels: string[] = [];
        const statsElement = document.querySelector<HTMLElement>(".stats")!;
        const statsContentRightEdge =
          statsElement.getBoundingClientRect().right -
          Number.parseFloat(getComputedStyle(statsElement).paddingRight);
        for (const gaugeLabel of document.querySelectorAll<HTMLElement>(
          ".gauges .gl",
        )) {
          const labelBounds = gaugeLabel.getBoundingClientRect();
          if (labelBounds.right > statsContentRightEdge + 1)
            overflowLabels.push(gaugeLabel.textContent!.trim());
          if (gaugeLabel.scrollWidth > gaugeLabel.clientWidth + 1)
            overflowLabels.push(gaugeLabel.textContent!.trim());
          for (const labelChild of gaugeLabel.children) {
            const childBounds = labelChild.getBoundingClientRect();
            if (
              childBounds.left < labelBounds.left - 1 ||
              childBounds.right > labelBounds.right + 1
            )
              overflowLabels.push(labelChild.textContent!.trim());
          }
        }
        return overflowLabels;
      });

      if (scenarioOverflowLabels.length)
        overflowReports.push(
          `${viewportWidth}px ${directiveId}: ${scenarioOverflowLabels.join(" / ")}`,
        );
    }
  }
  expect(overflowReports).toEqual([]);
});
