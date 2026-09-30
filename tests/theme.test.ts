import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  applyStyleUtilityMoves,
  styleUtilityMoves,
} from "./helpers/style-utility-migration";

const read = (path: string) =>
  readFileSync(new URL("../" + path, import.meta.url), "utf8");
const baselineCSS = execFileSync(
  "git",
  ["show", "affb670:src/styles/game.css"],
  { maxBuffer: 1_000_000 },
).toString("utf8");

test("Tailwind v4 uses its Vite plugin and inline aliases for every live game colour", () => {
  const pkg = JSON.parse(read("package.json")) as {
    devDependencies: Record<string, string>;
  };
  assert.match(pkg.devDependencies.tailwindcss, /^4\./);
  assert.equal(
    pkg.devDependencies["@tailwindcss/vite"],
    pkg.devDependencies.tailwindcss,
  );
  const config = read("vite.config.ts");
  assert.match(config, /import tailwindcss from "@tailwindcss\/vite"/);
  assert.match(config, /plugins: \[vue\(\), tailwindcss\(\)\]/);
  assert.match(read("src/main.ts"), /import "\.\/styles\/tailwind\.css"/);
  const theme = read("src/styles/tailwind.css");
  assert.match(theme, /@theme inline\s*\{/);
  assert.match(theme, /--color-\*: initial;/);
  assert.doesNotMatch(
    theme,
    /@import\s+["'](?:tailwindcss|tailwindcss\/preflight\.css)["']/,
  );
  const root = baselineCSS.slice(0, baselineCSS.indexOf("--glow:"));
  const colours = [...root.matchAll(/(--[\w-]+):#[\da-f]+/gi)];
  assert.equal(colours.length, 21);
  for (const [, token] of colours)
    assert.ok(
      theme.includes(`--color-${token.slice(2)}: var(${token});`),
      token,
    );
});

test("CSS utility moves preserve every unlisted rule and reject ambiguous targets", () => {
  assert.equal(styleUtilityMoves.length, 23);
  assert.equal(
    applyStyleUtilityMoves(baselineCSS).replace(/\s/g, ""),
    read("src/styles/game.css").replace(/\s/g, ""),
  );
  assert.throws(() => applyStyleUtilityMoves(""), /not unique/);
  assert.throws(
    () => applyStyleUtilityMoves(baselineCSS + styleUtilityMoves[0][0]),
    /not unique/,
  );
});
