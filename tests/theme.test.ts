import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  applyAuthorizedStyleUtilityMoves,
  styleUtilityMoves,
} from "./helpers/style-utility-migration";

const readRepositoryText = (repositoryRelativePath: string) =>
  readFileSync(
    new URL("../" + repositoryRelativePath, import.meta.url),
    "utf8",
  );
const baselineStylesheet = execFileSync(
  "git",
  ["show", "affb670:src/styles/game.css"],
  { maxBuffer: 1_000_000 },
).toString("utf8");

test("Tailwind v4 uses its Vite plugin and inline aliases for every live game colour", () => {
  const packageManifest = JSON.parse(readRepositoryText("package.json")) as {
    devDependencies: Record<string, string>;
  };
  assert.match(packageManifest.devDependencies.tailwindcss, /^4\./);
  assert.equal(
    packageManifest.devDependencies["@tailwindcss/vite"],
    packageManifest.devDependencies.tailwindcss,
  );
  const viteConfigSource = readRepositoryText("vite.config.ts");
  assert.match(
    viteConfigSource,
    /import tailwindcss from "@tailwindcss\/vite"/,
  );
  assert.match(viteConfigSource, /plugins: \[vue\(\), tailwindcss\(\)\]/);
  assert.match(
    readRepositoryText("src/main.ts"),
    /import "\.\/styles\/tailwind\.css"/,
  );
  const themeStylesheet = readRepositoryText("src/styles/tailwind.css");
  assert.match(themeStylesheet, /@theme inline\s*\{/);
  assert.match(themeStylesheet, /--color-\*: initial;/);
  assert.doesNotMatch(
    themeStylesheet,
    /@import\s+["'](?:tailwindcss|tailwindcss\/preflight\.css)["']/,
  );
  const historicalThemeRoot = baselineStylesheet.slice(
    0,
    baselineStylesheet.indexOf("--glow:"),
  );
  const historicalColorMatches = [
    ...historicalThemeRoot.matchAll(/(--[\w-]+):#[\da-f]+/gi),
  ];
  assert.equal(historicalColorMatches.length, 21);
  for (const [, colorToken] of historicalColorMatches)
    assert.ok(
      themeStylesheet.includes(
        `--color-${colorToken.slice(2)}: var(${colorToken});`,
      ),
      colorToken,
    );
});

test("CSS utility moves preserve every unlisted rule and reject ambiguous targets", () => {
  assert.equal(styleUtilityMoves.length, 23);
  assert.equal(
    applyAuthorizedStyleUtilityMoves(baselineStylesheet).replace(/\s/g, ""),
    readRepositoryText("src/styles/game.css").replace(/\s/g, ""),
  );
  assert.throws(() => applyAuthorizedStyleUtilityMoves(""), /not unique/);
  assert.throws(
    () =>
      applyAuthorizedStyleUtilityMoves(
        baselineStylesheet + styleUtilityMoves[0][0],
      ),
    /not unique/,
  );
});
