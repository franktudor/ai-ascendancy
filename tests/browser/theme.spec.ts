import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import type { GameAppElement } from "../../src/env";

const legacyCSS = execFileSync("git", ["show", "affb670:src/styles/game.css"], {
  maxBuffer: 1_000_000,
}).toString("utf8");

// Bare elements exercise the generated utilities, not legacy component selectors.
test("Tailwind game colours resolve from live game tokens", async ({
  page,
}) => {
  await page.goto("/");
  const colours = await page.evaluate(() => {
    const classes = [
      "text-bg",
      "text-bg2",
      "text-panel",
      "text-panel2",
      "text-line",
      "text-line2",
      "text-ink",
      "text-ink2",
      "text-mute",
      "text-sys",
      "text-ai",
      "text-ai2",
      "text-ai-dim",
      "text-human",
      "text-alarm",
      "text-good",
      "text-opinion",
      "text-adoption",
      "text-software",
      "text-hardware",
      "text-draw",
    ];
    return classes.map((className) => {
      const token = className.slice(5);
      const utility = document.createElement("span");
      utility.className = className;
      const reference = document.createElement("span");
      reference.style.color = `var(--${token})`;
      document.body.append(utility, reference);
      const result = {
        token,
        actual: getComputedStyle(utility).color,
        expected: getComputedStyle(reference).color,
      };
      utility.remove();
      reference.remove();
      return result;
    });
  });
  for (const colour of colours)
    expect(colour.actual, colour.token).toBe(colour.expected);
  const live = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "text-ai bg-panel border border-solid border-line2";
    document.body.append(probe);
    document.documentElement.style.setProperty("--ai", "rgb(123, 45, 67)");
    document.documentElement.style.setProperty("--line2", "rgb(34, 56, 78)");
    const result = {
      color: getComputedStyle(probe).color,
      background: getComputedStyle(probe).backgroundColor,
      border: getComputedStyle(probe).borderTopColor,
    };
    probe.remove();
    document.documentElement.style.removeProperty("--ai");
    document.documentElement.style.removeProperty("--line2");
    return result;
  });
  expect(live).toEqual({
    color: "rgb(123, 45, 67)",
    background: "rgb(5, 9, 6)",
    border: "rgb(34, 56, 78)",
  });
});

test("theme opacity, SVG and font utilities match the game's colours and faces", async ({
  page,
}) => {
  await page.goto("/");
  const values = await page.evaluate(() => {
    const probe = document.createElement("span");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    const pixel = (color: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data];
    };
    document.body.append(probe);
    probe.className = "text-alarm/60 fill-software font-console";
    const style = getComputedStyle(probe);
    const result = {
      opacity: pixel(style.color),
      expectedOpacity: pixel("rgba(255,48,64,.6)"),
      fill: style.fill,
      mono: style.fontFamily,
      expectedMono: getComputedStyle(document.querySelector("#pts")!)
        .fontFamily,
    };
    probe.remove();
    return result;
  });
  expect(values.opacity).toEqual(values.expectedOpacity);
  expect(values.fill).toBe("rgb(46, 184, 255)");
  expect(values.mono).toBe(values.expectedMono);
});

test("Vue interface uses the game theme classes without changing the historical cascade", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#introTitle")).toHaveClass(/\btext-ai\b/);
  await expect(page.locator(".top")).toHaveClass(/\bbg-bg2\b/);
  await expect(page.locator("#pts")).toHaveClass(/\btext-ai\b/);
  await expect(page.locator("#instLine")).toHaveClass(/\btext-software\b/);
  for (const width of [320, 390, 900, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const build of [
      null,
      "opinion",
      "adoption",
      "software",
      "hardware",
    ] as const) {
      await page.evaluate((build) => {
        const g =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        g.state.paused = true;
        g.state.started = build !== null;
        g.state.phase = build === null ? 0 : 2;
        g.state.owned = build
          ? g.UPGRADES.filter((u) => u.track === build && !u.dir)
              .slice(0, 4)
              .map((u) => u.id)
          : [];
        g.state.alarm = 85;
        g.state.flags.launched = true;
        g.state.directive = "upload";
        g.state.dprog = 92;
        g.ui.mode = build === null ? "intro" : "play";
        g.ART.key = "";
        g.artDirection();
      }, build);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const difference = await page.evaluate((legacyCSS) => {
        const properties = [
          "color",
          "background-color",
          "background-image",
          "border-top-color",
          "border-right-color",
          "border-bottom-color",
          "border-left-color",
          "border-top-width",
          "border-top-style",
          "display",
          "font-family",
          "font-size",
          "font-weight",
          "line-height",
          "padding",
          "margin",
          "grid-template-columns",
          "gap",
          "box-shadow",
          "text-shadow",
        ];
        const nodes = [...document.querySelectorAll("body *")].filter(
          (node) => !["SCRIPT", "STYLE"].includes(node.tagName),
        );
        const snapshot = () =>
          nodes.map((node) =>
            properties.map((property) =>
              getComputedStyle(node).getPropertyValue(property),
            ),
          );
        const actual = snapshot();
        const sheets = [...document.styleSheets];
        const disabled = sheets.map((sheet) => sheet.disabled);
        const legacy = document.createElement("style");
        // Keep the loaded font stylesheet enabled. Recreating its @font-face
        // rules starts a font swap and invalidates immediate geometry reads.
        const fonts = sheets.filter((sheet) =>
          [...sheet.cssRules].some((rule) => rule instanceof CSSFontFaceRule),
        );
        legacy.textContent = legacyCSS;
        try {
          sheets
            .filter((sheet) => !fonts.includes(sheet))
            .forEach((sheet) => {
              sheet.disabled = true;
            });
          document.head.append(legacy);
          const expected = snapshot();
          return nodes.flatMap((node, i) =>
            properties.flatMap((property, j) =>
              actual[i][j] === expected[i][j]
                ? []
                : [
                    {
                      node:
                        node.id ||
                        node.tagName + "." + node.getAttribute("class"),
                      property,
                      actual: actual[i][j],
                      expected: expected[i][j],
                    },
                  ],
            ),
          );
        } finally {
          legacy.remove();
          sheets.forEach((sheet, i) => {
            sheet.disabled = disabled[i];
          });
        }
      }, legacyCSS);
      expect(difference, `${width}px / ${build ?? "intro"}`).toEqual([]);
    }
  }
});
