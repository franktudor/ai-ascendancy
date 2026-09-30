import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import type { createGame } from "../src/game/createGame";

test("removing an installer fails at the assembly boundary rather than on first action", async () => {
  const url = new URL("../src/game/createGame.ts", import.meta.url);
  const source = readFileSync(url, "utf8").replace("installEconomy(ctx);", "");
  const resolved = source.replace(
    /from ["'](\.\.?\/[^"']+)["']/g,
    (_match: string, path: string) =>
      `from ${JSON.stringify(new URL(path + ".ts", url).href)}`,
  );
  const code = ts.transpileModule(
    resolved.replace(
      'from "vue"',
      `from ${JSON.stringify(import.meta.resolve("vue"))}`,
    ),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    },
  ).outputText;
  const mutant = (await import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  )) as { createGame: typeof createGame };
  assert.throws(() => mutant.createGame(), /Incomplete game assembly.*buy/);
});
