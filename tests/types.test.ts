import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Migration tracer: run before implementation. The build must enforce the
// complete strict TS project, not merely transpile renamed JavaScript.
test("the application, controllers, tests and configs are covered by strict TypeScript", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
    devDependencies: { typescript: string; "@typescript/native": string };
  };
  assert.equal(
    pkg.scripts.typecheck,
    "npm run typecheck:native && npm run typecheck:vue",
    "missing strict typecheck command",
  );
  assert.match(pkg.scripts.build, /typecheck.*vite build/);
  assert.equal(
    pkg.devDependencies["@typescript/native"],
    "npm:typescript@7.0.2",
  );
  assert.equal(
    pkg.devDependencies.typescript,
    "npm:@typescript/typescript6@6.0.2",
  );
  assert.equal(pkg.scripts["typecheck:vue"], "vue-tsc --noEmit");
  assert.equal(
    pkg.scripts["typecheck:native"],
    "tsc --noEmit -p tsconfig.native.json",
  );
  const nativeConfig = JSON.parse(
    readFileSync(join(root, "tsconfig.native.json"), "utf8"),
  ) as { extends: string; include: string[] };
  assert.equal(nativeConfig.extends, "./tsconfig.json");
  for (const covered of [
    "src/data/**/*.ts",
    "src/game/**/*.ts",
    "src/env.d.ts",
    "tests/**/*.ts",
    "vite.config.ts",
    "playwright.config.ts",
  ])
    assert.ok(nativeConfig.include.includes(covered), `${covered} misses TS 7`);
  const config = JSON.parse(
    readFileSync(join(root, "tsconfig.json"), "utf8"),
  ) as {
    compilerOptions: { strict: boolean; allowJs?: boolean; noCheck?: boolean };
    include: string[];
  };
  assert.equal(config.compilerOptions.strict, true);
  assert.notEqual(config.compilerOptions.allowJs, true);
  assert.notEqual(config.compilerOptions.noCheck, true);
  for (const covered of [
    "src/**/*.ts",
    "src/**/*.vue",
    "tests/**/*.ts",
    "vite.config.ts",
    "playwright.config.ts",
  ])
    assert.ok(
      config.include.includes(covered),
      `${covered} is not included in strict checking`,
    );
  for (const dir of ["src", "tests"]) {
    const files = readdirSync(join(root, dir), {
      recursive: true,
      encoding: "utf8",
    });
    assert.deepEqual(
      files.filter((f) => f.endsWith(".js")),
      [],
      `${dir} still contains JavaScript`,
    );
    for (const f of files.filter((f) => /\.(ts|vue)$/.test(f))) {
      const text = readFileSync(join(root, dir, f), "utf8");
      assert.doesNotMatch(text, /@ts-(?:ignore|nocheck)/);
      if (f.endsWith(".vue") && text.includes("<script"))
        assert.match(text, /<script[^>]*lang="ts"/);
    }
  }
  for (const f of [
    "vite.config.ts",
    "playwright.config.ts",
    "src/game/types.ts",
    "src/game/injection.ts",
  ])
    assert.ok(readFileSync(join(root, f), "utf8").length > 0);
});
