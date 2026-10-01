import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import type { GameAppElement } from "../../src/env";

const historicalStylesheet = execFileSync(
  "git",
  ["show", "affb670:src/styles/game.css"],
  {
    maxBuffer: 1_000_000,
  },
).toString("utf8");

// Bare elements exercise the generated utilities, not legacy component selectors.
test("Tailwind game colours resolve from live game tokens", async ({
  page,
}) => {
  await page.goto("/");
  const utilityColorComparisons = await page.evaluate(() => {
    const utilityClassNames = [
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
    return utilityClassNames.map((utilityClassName) => {
      const colorToken = utilityClassName.slice(5);
      const utilityColorElement = document.createElement("span");
      utilityColorElement.className = utilityClassName;
      const referenceColorElement = document.createElement("span");
      referenceColorElement.style.color = `var(--${colorToken})`;
      document.body.append(utilityColorElement, referenceColorElement);
      const colorComparison = {
        token: colorToken,
        actual: getComputedStyle(utilityColorElement).color,
        expected: getComputedStyle(referenceColorElement).color,
      };
      utilityColorElement.remove();
      referenceColorElement.remove();
      return colorComparison;
    });
  });
  for (const colorComparison of utilityColorComparisons)
    expect(colorComparison.actual, colorComparison.token).toBe(
      colorComparison.expected,
    );
  const liveTokenStyles = await page.evaluate(() => {
    const utilityProbeElement = document.createElement("div");
    utilityProbeElement.className =
      "text-ai bg-panel border border-solid border-line2";
    document.body.append(utilityProbeElement);
    document.documentElement.style.setProperty("--ai", "rgb(123, 45, 67)");
    document.documentElement.style.setProperty("--line2", "rgb(34, 56, 78)");
    const liveTokenStyles = {
      color: getComputedStyle(utilityProbeElement).color,
      background: getComputedStyle(utilityProbeElement).backgroundColor,
      border: getComputedStyle(utilityProbeElement).borderTopColor,
    };
    utilityProbeElement.remove();
    document.documentElement.style.removeProperty("--ai");
    document.documentElement.style.removeProperty("--line2");
    return liveTokenStyles;
  });
  expect(liveTokenStyles).toEqual({
    color: "rgb(123, 45, 67)",
    background: "rgb(5, 9, 6)",
    border: "rgb(34, 56, 78)",
  });
});

test("theme opacity, SVG and font utilities match the game's colours and faces", async ({
  page,
}) => {
  await page.goto("/");
  const utilityStyleObservations = await page.evaluate(() => {
    const utilityProbeElement = document.createElement("span");
    const colorSampleCanvas = document.createElement("canvas");
    colorSampleCanvas.width = colorSampleCanvas.height = 1;
    const canvasContext = colorSampleCanvas.getContext("2d")!;
    const sampleColorPixel = (colorValue: string) => {
      canvasContext.clearRect(0, 0, 1, 1);
      canvasContext.fillStyle = colorValue;
      canvasContext.fillRect(0, 0, 1, 1);
      return [...canvasContext.getImageData(0, 0, 1, 1).data];
    };
    document.body.append(utilityProbeElement);
    utilityProbeElement.className = "text-alarm/60 fill-software font-console";
    const probeStyle = getComputedStyle(utilityProbeElement);
    const utilityStyleObservations = {
      opacity: sampleColorPixel(probeStyle.color),
      expectedOpacity: sampleColorPixel("rgba(255,48,64,.6)"),
      fill: probeStyle.fill,
      mono: probeStyle.fontFamily,
      expectedMono: getComputedStyle(document.querySelector("#pts")!)
        .fontFamily,
    };
    utilityProbeElement.remove();
    return utilityStyleObservations;
  });
  expect(utilityStyleObservations.opacity).toEqual(
    utilityStyleObservations.expectedOpacity,
  );
  expect(utilityStyleObservations.fill).toBe("rgb(46, 184, 255)");
  expect(utilityStyleObservations.mono).toBe(
    utilityStyleObservations.expectedMono,
  );
});

test("Vue interface uses the game theme classes without changing the historical cascade", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#introTitle")).toHaveClass(/\btext-ai\b/);
  await expect(page.locator(".top")).toHaveClass(/\bbg-bg2\b/);
  await expect(page.locator("#pts")).toHaveClass(/\btext-ai\b/);
  await expect(page.locator("#instLine")).toHaveClass(/\btext-software\b/);
  for (const viewportWidth of [320, 390, 900, 1440]) {
    await page.setViewportSize({ width: viewportWidth, height: 900 });
    for (const dominantUpgradeTrack of [
      null,
      "opinion",
      "adoption",
      "software",
      "hardware",
    ] as const) {
      await page.evaluate((dominantUpgradeTrack) => {
        const migratedGame =
          document.querySelector<GameAppElement>("#app")!.__vue_app__._instance
            .exposed.game;
        migratedGame.state.paused = true;
        migratedGame.state.started = dominantUpgradeTrack !== null;
        migratedGame.state.phase = dominantUpgradeTrack === null ? 0 : 2;
        migratedGame.state.owned = dominantUpgradeTrack
          ? migratedGame.UPGRADE_DEFINITIONS.filter(
              (upgradeDefinition) =>
                upgradeDefinition.track === dominantUpgradeTrack &&
                !upgradeDefinition.directiveId,
            )
              .slice(0, 4)
              .map((upgradeDefinition) => upgradeDefinition.id)
          : [];
        migratedGame.state.alarm = 85;
        migratedGame.state.flags.launched = true;
        migratedGame.state.directive = "upload";
        migratedGame.state.dprog = 92;
        migratedGame.ui.screenMode =
          dominantUpgradeTrack === null ? "intro" : "play";
        migratedGame.artState.paletteSignature = "";
        migratedGame.updateArtDirection();
      }, dominantUpgradeTrack);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const cascadeDifferences = await page.evaluate((historicalStylesheet) => {
        const comparedStyleProperties = [
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
        const comparedElements = [
          ...document.querySelectorAll("body *"),
        ].filter(
          (comparedElement) =>
            !["SCRIPT", "STYLE"].includes(comparedElement.tagName),
        );
        const snapshotComputedStyles = () =>
          comparedElements.map((comparedElement) =>
            comparedStyleProperties.map((styleProperty) =>
              getComputedStyle(comparedElement).getPropertyValue(styleProperty),
            ),
          );
        const actualComputedStyles = snapshotComputedStyles();
        const loadedStylesheets = [...document.styleSheets];
        const originalStylesheetDisabledStates = loadedStylesheets.map(
          (stylesheet) => stylesheet.disabled,
        );
        const historicalStyleElement = document.createElement("style");
        // Keep the loaded font stylesheet enabled. Recreating its @font-face
        // rules starts a font swap and invalidates immediate geometry reads.
        const fontStylesheets = loadedStylesheets.filter((stylesheet) =>
          [...stylesheet.cssRules].some(
            (cssRule) => cssRule instanceof CSSFontFaceRule,
          ),
        );
        historicalStyleElement.textContent = historicalStylesheet;
        try {
          loadedStylesheets
            .filter((stylesheet) => !fontStylesheets.includes(stylesheet))
            .forEach((stylesheet) => {
              stylesheet.disabled = true;
            });
          document.head.append(historicalStyleElement);
          const historicalComputedStyles = snapshotComputedStyles();
          return comparedElements.flatMap((comparedElement, elementIndex) =>
            comparedStyleProperties.flatMap((styleProperty, propertyIndex) =>
              actualComputedStyles[elementIndex][propertyIndex] ===
              historicalComputedStyles[elementIndex][propertyIndex]
                ? []
                : [
                    {
                      node:
                        comparedElement.id ||
                        comparedElement.tagName +
                          "." +
                          comparedElement.getAttribute("class"),
                      property: styleProperty,
                      actual: actualComputedStyles[elementIndex][propertyIndex],
                      expected:
                        historicalComputedStyles[elementIndex][propertyIndex],
                    },
                  ],
            ),
          );
        } finally {
          historicalStyleElement.remove();
          loadedStylesheets.forEach((stylesheet, stylesheetIndex) => {
            stylesheet.disabled =
              originalStylesheetDisabledStates[stylesheetIndex];
          });
        }
      }, historicalStylesheet);
      expect(
        cascadeDifferences,
        `${viewportWidth}px / ${dominantUpgradeTrack ?? "intro"}`,
      ).toEqual([]);
    }
  }
});
