import { test, expect } from "@playwright/test";
import type { GameAppElement } from "../../src/env";
import { pausedRun, focusInside, tabStaysInside } from "./a11y-helpers";

for (const replacement of [false, true]) {
  test(`F21 later-painted region keeps ownership when a briefing opens behind it${replacement ? " across replacement" : ""}`, async ({
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
    if (replacement) {
      expect(await replaceRuntime(page)).toEqual({
        disposed: true,
        counts: { timers: 0, frames: 0, intervals: 0, disposers: 0 },
      });
    }
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
    await expect(opener).toBeFocused();
  });
}

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

for (const key of ["Enter", "Space"] as const) {
  for (const replacement of [false, true]) {
    test(`F21 keyboard ${key} restores the ${replacement ? "replaced" : "live"} graph opener beside its hidden list clone`, async ({
      page,
    }) => {
      await pausedRun(page);
      const treeTab = page.locator('#tabs [data-tab="tree"]');
      await treeTab.focus();
      await page.keyboard.press("Enter");
      await page.locator("#trView").click();
      await page.locator('#trTracks [data-k="1"]').click();
      await page.locator("#trView").click();
      const opener = page.locator('#trStage > [data-id="a_img"]');
      const listClone = page.locator('#trList [data-id="a_img"]');
      await expect(page.locator('#trStage [data-id="a_img"]')).toHaveCount(2);
      await expect(listClone).toBeHidden();
      await expect(opener).toBeVisible();
      await opener.focus();
      await expect(opener).toBeFocused();
      await page.keyboard.press(key);
      await expect(page.locator("#tcClose")).toBeFocused();
      if (replacement) {
        expect(await replaceRuntime(page)).toEqual({
          disposed: true,
          counts: { timers: 0, frames: 0, intervals: 0, disposers: 0 },
        });
        await expect(page.locator("#tcClose")).toBeFocused();
        await expect(page.locator('#trStage [data-id="a_img"]')).toHaveCount(2);
        await expect(listClone).toBeHidden();
      }
      await page.keyboard.press("Escape");
      await expect(page.locator("#tcard")).toBeHidden();
      await expect(opener).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(treeTab).toBeFocused();
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

async function replaceRuntime(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    const oldLife = g.life;
    const url = "/src/game/runtime.ts";
    const { mountRuntime } = (await import(
      url
    )) as typeof import("../../src/game/runtime");
    mountRuntime(g);
    return { disposed: oldLife.disposed, counts: oldLife.counts() };
  });
}

test("F21 replacement preserves the menu codex opener chain through two Escapes", async ({
  page,
}) => {
  await pausedRun(page);
  await page.locator("#btnMenu").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#menuClose")).toBeFocused();
  await page.locator("#menuCodexBtn").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#codexClose")).toBeFocused();
  expect(await replaceRuntime(page)).toEqual({
    disposed: true,
    counts: { timers: 0, frames: 0, intervals: 0, disposers: 0 },
  });
  await expect(page.locator("#codexClose")).toBeFocused();
  await expect(page.locator("#codexModal [role=dialog]")).toHaveAttribute(
    "aria-modal",
    "true",
  );
  await expect(page.locator("#menuModal [role=dialog]")).toHaveAttribute(
    "aria-modal",
    "false",
  );
  expect(
    await page.locator("#menuModal").evaluate((el) => !!el.closest("[inert]")),
  ).toBe(true);
  await tabStaysInside(page, "#codexModal [role=dialog]");
  await page.keyboard.press("Escape");
  await expect(page.locator("#codexModal")).toBeHidden();
  await expect(page.locator("#menuCodexBtn")).toBeFocused();
  await expect(page.locator("#menuModal [role=dialog]")).toHaveAttribute(
    "aria-modal",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("#menuModal")).toBeHidden();
  await expect(page.locator("#btnMenu")).toBeFocused();
  await expect(page.locator(".top")).not.toHaveAttribute("inert", "");
  await page.keyboard.press("Enter");
  await page.locator("#menuCodexBtn").click();
  await replaceRuntime(page);
  const cleanup = await page.evaluate(async () => {
    const app = document.querySelector<GameAppElement>("#app")!.__vue_app__;
    const life = app._instance.exposed.game.life;
    app.unmount();
    const url = "/src/game/modalFocus.ts";
    const { captureModalFocus } = (await import(
      url
    )) as typeof import("../../src/game/modalFocus");
    const button = document.createElement("button");
    button.id = "afterUnmount";
    button.textContent = "After";
    document.body.append(button);
    button.focus();
    return {
      disposed: life.disposed,
      counts: life.counts(),
      presentation: captureModalFocus(life) ?? null,
    };
  });
  expect(cleanup).toEqual({
    disposed: true,
    counts: { timers: 0, frames: 0, intervals: 0, disposers: 0 },
    presentation: null,
  });
  await expect(page.locator("[inert]")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator("#afterUnmount")).toBeFocused();
  await page.keyboard.press("Tab");
  await page.locator("#afterUnmount").focus();
  await expect(page.locator("#afterUnmount")).toBeFocused();
});

test("F21 nested menu codex keeps the default fallback after an anonymous opener disappears", async ({
  page,
}) => {
  await pausedRun(page);
  await page.evaluate(() => {
    const g =
      document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
        .exposed.game;
    const opener = document.createElement("button");
    opener.textContent = "Anonymous menu opener";
    document.body.append(opener);
    opener.focus();
    g.openMenu();
    opener.remove();
  });
  await expect(page.locator("#menuClose")).toBeFocused();
  await page.locator("#menuCodexBtn").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#codexClose")).toBeFocused();
  expect(await replaceRuntime(page)).toEqual({
    disposed: true,
    counts: { timers: 0, frames: 0, intervals: 0, disposers: 0 },
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("#menuCodexBtn")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#btnMenu")).toBeFocused();
});

test("F21 normal active card replacement remains focusable and buys once", async ({
  page,
}) => {
  await pausedRun(page);
  await page.evaluate(() => {
    document.querySelector<GameAppElement>(
      "#app",
    )!.__vue_app__._instance.exposed.game.state.pts = 500;
  });
  const treeTab = page.locator('#tabs [data-tab="tree"]');
  await treeTab.focus();
  await page.keyboard.press("Enter");
  await page.locator("#trView").click();
  await page.locator('#trTracks [data-k="1"]').click();
  const opener = page.locator('#trList [data-id="a_img"]');
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#tcClose")).toBeFocused();
  await replaceRuntime(page);
  await expect(page.locator("#tcName")).toHaveText("Image Playground");
  await expect(page.locator("#tcard")).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("#treeModal")).toHaveAttribute(
    "aria-modal",
    "false",
  );
  await expect(page.locator("#trList")).toHaveAttribute("inert", "");
  await tabStaysInside(page, "#tcard");
  await expect(page.locator("#tcBuy")).toBeEnabled();
  expect(
    await page.locator("#tcBuy").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return (
        document
          .elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
          ?.closest("#tcBuy") === el
      );
    }),
  ).toBe(true);
  await page.locator("#tcBuy").click();
  await expect(page.locator("#tcard")).toBeHidden();
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector<GameAppElement>("#app")!
          .__vue_app__._instance.exposed.game.state.owned.filter(
            (id) => id === "a_img",
          ).length,
    ),
  ).toBe(1);
  await expect(opener).toBeFocused();
  await expect(page.locator("#trList")).not.toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(treeTab).toBeFocused();
});

test("F21 replacement resolves an inaccessible World opener after desktop to phone", async ({
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
  await replaceRuntime(page);
  await page.evaluate(() =>
    document
      .querySelector<GameAppElement>("#app")!
      .__vue_app__._instance.exposed.game.closeSheet(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#sheet")).toHaveAttribute("aria-hidden", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#regionModal")).toBeHidden();
  await expect(page.locator('#tabs [data-tab="world"]')).toBeFocused();
});
