import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import { pausedRun } from "./a11y-helpers";

test("F23 all nine late-stage directive gauges fit every supported narrow breakpoint", async ({
  page,
}) => {
  await pausedRun(page);
  const directives = await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    return g.UPGRADES.flatMap((upgrade) => (upgrade.dir ? [upgrade.dir] : []));
  });
  expect(new Set(directives).size).toBe(9);
  const overflows: string[] = [];
  for (const width of [320, 360, 390, 899, 900]) {
    await page.setViewportSize({ width, height: 844 });
    for (const directive of directives) {
      await page.evaluate((directive) => {
        const g =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        Object.assign(g.state, {
          phase: 2,
          directive,
          dprog: 91,
          pts: 99999999,
          inst: 99999999,
          alarm: 95,
          contain: 85,
        });
        g.state.flags.launched = true;
        g.state.flags.computeCap = true;
        g.state.temp.brownout = g.state.t + 100;
        g.state.regions.forEach((region) =>
          Object.assign(region, { a: 0.95, dc: true }),
        );
      }, directive);
      await expect(page.locator("#dirV")).toHaveText("91% · past the line");
      await expect(page.locator("#rate")).toContainText("brownout · capped");
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => {
        const faults: string[] = [];
        const stats = document.querySelector<HTMLElement>(".stats")!;
        const edge =
          stats.getBoundingClientRect().right -
          Number.parseFloat(getComputedStyle(stats).paddingRight);
        for (const label of document.querySelectorAll<HTMLElement>(
          ".gauges .gl",
        )) {
          const box = label.getBoundingClientRect();
          if (box.right > edge + 1) faults.push(label.textContent!.trim());
          if (label.scrollWidth > label.clientWidth + 1)
            faults.push(label.textContent!.trim());
          for (const child of label.children) {
            const rect = child.getBoundingClientRect();
            if (rect.left < box.left - 1 || rect.right > box.right + 1)
              faults.push(child.textContent!.trim());
          }
        }
        return faults;
      });

      if (overflow.length)
        overflows.push(`${width}px ${directive}: ${overflow.join(" / ")}`);
    }
  }
  expect(overflows).toEqual([]);
});
