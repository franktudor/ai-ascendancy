import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

function assertTypeScriptLaunchersCovered(
  includedPathPatterns: readonly string[],
  compilerLabel: string,
): void {
  assert.ok(
    includedPathPatterns.includes("scripts/**/*.ts"),
    `scripts/**/*.ts misses ${compilerLabel}`,
  );
}

test("compiler coverage guard rejects excluding TS launchers in either project", () => {
  for (const compilerConfigFilename of [
    "tsconfig.json",
    "tsconfig.native.json",
  ]) {
    const compilerConfig = JSON.parse(
      readFileSync(
        new URL("../" + compilerConfigFilename, import.meta.url),
        "utf8",
      ),
    ) as { include: string[] };
    const configurationWithoutLaunchers = compilerConfig.include.filter(
      (includedPathPattern) => includedPathPattern !== "scripts/**/*.ts",
    );
    assert.throws(
      () =>
        assertTypeScriptLaunchersCovered(
          configurationWithoutLaunchers,
          compilerConfigFilename,
        ),
      /scripts\/\*\*\/\*\.ts misses/,
    );
  }
});

// Migration tracer: run before implementation. The build must enforce the
// complete strict TS project, not merely transpile renamed JavaScript.
test("the application, controllers, tests and configs are covered by strict TypeScript", () => {
  const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
  const packageManifest = JSON.parse(
    readFileSync(join(repositoryRoot, "package.json"), "utf8"),
  ) as {
    scripts: Record<string, string>;
    devDependencies: { typescript: string; "@typescript/native": string };
  };
  assert.equal(
    packageManifest.scripts.typecheck,
    "npm run typecheck:native && npm run typecheck:vue",
    "missing strict typecheck command",
  );
  assert.match(packageManifest.scripts.build, /typecheck.*vite build/);
  assert.equal(
    packageManifest.devDependencies["@typescript/native"],
    "npm:typescript@7.0.2",
  );
  assert.equal(
    packageManifest.devDependencies.typescript,
    "npm:@typescript/typescript6@6.0.2",
  );
  assert.equal(packageManifest.scripts["typecheck:vue"], "vue-tsc --noEmit");
  assert.equal(
    packageManifest.scripts["typecheck:native"],
    "tsc --noEmit -p tsconfig.native.json",
  );
  const nativeCompilerConfig = JSON.parse(
    readFileSync(join(repositoryRoot, "tsconfig.native.json"), "utf8"),
  ) as { extends: string; include: string[] };
  assert.equal(nativeCompilerConfig.extends, "./tsconfig.json");
  assertTypeScriptLaunchersCovered(nativeCompilerConfig.include, "TS 7");
  for (const requiredPathPattern of [
    "src/data/**/*.ts",
    "src/game/**/*.ts",
    "src/env.d.ts",
    "tests/**/*.ts",
    "vite.config.ts",
    "playwright.config.ts",
  ])
    assert.ok(
      nativeCompilerConfig.include.includes(requiredPathPattern),
      `${requiredPathPattern} misses TS 7`,
    );
  const compilerConfig = JSON.parse(
    readFileSync(join(repositoryRoot, "tsconfig.json"), "utf8"),
  ) as {
    compilerOptions: { strict: boolean; allowJs?: boolean; noCheck?: boolean };
    include: string[];
  };
  assert.equal(compilerConfig.compilerOptions.strict, true);
  assert.notEqual(compilerConfig.compilerOptions.allowJs, true);
  assert.notEqual(compilerConfig.compilerOptions.noCheck, true);
  assertTypeScriptLaunchersCovered(compilerConfig.include, "strict checking");
  for (const requiredPathPattern of [
    "src/**/*.ts",
    "src/**/*.vue",
    "tests/**/*.ts",
    "vite.config.ts",
    "playwright.config.ts",
  ])
    assert.ok(
      compilerConfig.include.includes(requiredPathPattern),
      `${requiredPathPattern} is not included in strict checking`,
    );
  for (const directory of ["src", "tests"]) {
    const directoryEntries = readdirSync(join(repositoryRoot, directory), {
      recursive: true,
      encoding: "utf8",
    });
    assert.deepEqual(
      directoryEntries.filter((sourceFilename) =>
        sourceFilename.endsWith(".js"),
      ),
      [],
      `${directory} still contains JavaScript`,
    );
    for (const sourceFilename of directoryEntries.filter((sourceFilename) =>
      /\.(ts|vue)$/.test(sourceFilename),
    )) {
      const sourceText = readFileSync(
        join(repositoryRoot, directory, sourceFilename),
        "utf8",
      );
      assert.doesNotMatch(sourceText, /@ts-(?:ignore|nocheck)/);
      if (sourceFilename.endsWith(".vue") && sourceText.includes("<script"))
        assert.match(sourceText, /<script[^>]*lang="ts"/);
    }
  }
  for (const sourceFilename of [
    "vite.config.ts",
    "playwright.config.ts",
    "src/game/types.ts",
    "src/game/injection.ts",
  ])
    assert.ok(
      readFileSync(join(repositoryRoot, sourceFilename), "utf8").length > 0,
    );
});
