import test from "node:test";
import assert from "node:assert/strict";
import { unsafeTypes } from "./helpers/type-safety";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import ts from "typescript";

test("AST guard rejects member-level explicit untyped parameters in TS and SFC scripts", () => {
  const keyword = ["a", "ny"].join("");
  for (const filename of [
    "src/game/types.ts",
    "tests/fixture.ts",
    "vite.config.ts",
    "Fixture.vue",
  ]) {
    const script = `interface Effects { pts(n: ${keyword}): string; }`;
    const text = filename.endsWith(".vue")
      ? `<script lang="ts">${script}</script><template>any</template>`
      : script;
    assert.equal(unsafeTypes(text, filename).length, 1, filename);
  }
  assert.deepEqual(
    unsafeTypes('const any = "any"; // any is prose', "safe.ts"),
    [],
  );
});

test("member-level compile contracts reject a widened effect argument", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const config = ts.readConfigFile(
    join(root, "tsconfig.native.json"),
    ts.sys.readFile,
  );
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const host = ts.createCompilerHost(parsed.options);
  const read = host.readFile.bind(host);
  host.readFile = (file) => {
    const source = read(file);
    return file.replaceAll("\\", "/").endsWith("/src/game/types.ts")
      ? source?.replace(
          "pts(n: number): string;",
          `pts(n: ${["a", "ny"].join("")}): string;`,
        )
      : source;
  };
  const program = ts.createProgram(parsed.fileNames, parsed.options, host);
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName.endsWith("type-contracts.ts"));
  assert.ok(
    diagnostics.some((d) => d.code === 2344),
    "member widening escaped compile-only contracts",
  );
});

test("all application, test, launcher and configuration ASTs reject explicit untyped escapes", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const files = [
    "vite.config.ts",
    "playwright.config.ts",
    ...["src", "tests", "scripts"].flatMap((dir) =>
      readdirSync(join(root, dir), { recursive: true, encoding: "utf8" })
        .filter((file) => /\.(ts|vue)$/.test(file))
        .map((file) => join(dir, file)),
    ),
  ];
  assert.deepEqual(
    files.flatMap((file) =>
      unsafeTypes(readFileSync(join(root, file), "utf8"), file),
    ),
    [],
  );
});
