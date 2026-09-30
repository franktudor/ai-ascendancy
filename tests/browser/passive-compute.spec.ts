import type { GameAppElement } from "../../src/env";
import { test, expect } from "@playwright/test";

test("F19 passive compute label reflects tick income, not rewards, funding or offline recovery", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    g.state = g.freshState();
    g.state.paused = true;
    const introIncome = g.derive().income;
    g.tick(2); // Intro passive ticks are counted until a new run resets stats.
    const intro = g.state.earned;
    g.newRun();
    const reset = g.state.earned;
    g.startRun(4); // Middle East initial funding is balance-only.
    g.closeTree();
    g.state.paused = true;
    const funding = g.state.earned;
    const income = g.derive().income;
    g.tick(2);
    const passive = g.state.earned;
    g.FX.pts(150);
    g.state.flags.fearsells = true;
    g.FX.alarm(10);
    g.makeEval().choices[1].fx();
    const rewards = g.state.earned;
    const saved = g.freshState();
    Object.assign(saved, {
      started: true,
      origin: "NA",
      savedAt: Date.now() - 60000,
      earned: passive,
    });
    g.resumeRun(saved);
    g.state.paused = true;
    const offline = g.state.earned;
    g.endGame("lose");
    return {
      intro,
      introExpected: introIncome * 2,
      reset,
      funding,
      passive,
      expected: income * 2,
      rewards,
      offline,
      label: document.querySelector("#endStats")!.textContent,
    };
  });
  expect(result.intro).toBe(result.introExpected);
  expect(result.reset).toBe(0);
  expect(result.funding).toBe(0);
  expect(result.passive).toBe(result.expected);
  expect(result.rewards).toBe(result.passive);
  expect(result.offline).toBe(result.passive);
  expect(result.label).toContain("Passive compute earned");
});
