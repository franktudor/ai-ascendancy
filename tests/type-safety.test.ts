import test from "node:test";
import assert from "node:assert/strict";
import { findUnsafeTypeDeclarations } from "./helpers/type-safety";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import typescript from "typescript";

test("AST guard rejects member-level explicit untyped parameters in TS and SFC scripts", () => {
  const untypedKeyword = ["a", "ny"].join("");
  for (const fixtureFilename of [
    "src/game/types.ts",
    "tests/fixture.ts",
    "vite.config.ts",
    "Fixture.vue",
  ]) {
    const unsafeFixtureScript = `interface Effects { adjustCompute(n: ${untypedKeyword}): string; }`;
    const fixtureSourceText = fixtureFilename.endsWith(".vue")
      ? `<script lang="ts">${unsafeFixtureScript}</script><template>any</template>`
      : unsafeFixtureScript;
    assert.equal(
      findUnsafeTypeDeclarations(fixtureSourceText, fixtureFilename).length,
      1,
      fixtureFilename,
    );
  }
  assert.deepEqual(
    findUnsafeTypeDeclarations('const any = "any"; // any is prose', "safe.ts"),
    [],
  );
});

test("member-level compile contracts reject a widened effect argument", () => {
  const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
  const compilerConfig = typescript.readConfigFile(
    join(repositoryRoot, "tsconfig.native.json"),
    typescript.sys.readFile,
  );
  const parsedCompilerConfig = typescript.parseJsonConfigFileContent(
    compilerConfig.config,
    typescript.sys,
    repositoryRoot,
  );
  const compilerHost = typescript.createCompilerHost(
    parsedCompilerConfig.options,
  );
  const readOriginalSourceFile = compilerHost.readFile.bind(compilerHost);
  let mutationCount = 0;
  compilerHost.readFile = (sourceFilePath) => {
    const sourceText = readOriginalSourceFile(sourceFilePath);
    if (!sourceFilePath.replaceAll("\\", "/").endsWith("/src/game/types.ts"))
      return sourceText;
    const effectDeclarationNeedle =
      "adjustCompute(computeDelta: number): string;";
    assert.equal(
      sourceText?.split(effectDeclarationNeedle).length,
      2,
      "effect mutation has one exact renamed target",
    );
    mutationCount++;
    return sourceText?.replace(
      effectDeclarationNeedle,
      `adjustCompute(computeDelta: ${["a", "ny"].join("")}): string;`,
    );
  };
  const mutatedProgram = typescript.createProgram(
    parsedCompilerConfig.fileNames,
    parsedCompilerConfig.options,
    compilerHost,
  );
  const contractDiagnostics = typescript
    .getPreEmitDiagnostics(mutatedProgram)
    .filter((diagnostic) =>
      diagnostic.file?.fileName.endsWith("type-contracts.ts"),
    );
  assert.equal(mutationCount, 1, "the intended effect declaration was widened");
  assert.ok(
    contractDiagnostics.some(
      (diagnostic) =>
        diagnostic.code === 2344 &&
        typescript
          .flattenDiagnosticMessageText(diagnostic.messageText, " ")
          .includes("constraint 'true'"),
    ),
    "member widening escaped compile-only contracts",
  );
});

test("all application, test, launcher and configuration ASTs reject explicit untyped escapes", () => {
  const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
  const checkedSourceFiles = [
    "vite.config.ts",
    "playwright.config.ts",
    ...["src", "tests", "scripts"].flatMap((directory) =>
      readdirSync(join(repositoryRoot, directory), {
        recursive: true,
        encoding: "utf8",
      })
        .filter((sourceFilePath) => /\.(ts|vue)$/.test(sourceFilePath))
        .map((sourceFilePath) => join(directory, sourceFilePath)),
    ),
  ];
  assert.deepEqual(
    checkedSourceFiles.flatMap((sourceFilePath) =>
      findUnsafeTypeDeclarations(
        readFileSync(join(repositoryRoot, sourceFilePath), "utf8"),
        sourceFilePath,
      ),
    ),
    [],
  );
});
