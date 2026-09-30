import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createGame } from "../src/game/createGame";
import {
  assertGameAssembly,
  installedMembers,
  seedMembers,
} from "../src/game/assembly";
import type { ConstructionRole } from "../src/game/assembly";
import * as catalog from "../src/data/catalog";
import * as utils from "../src/game/utils";

const installerPaths = {
  installSimulation: "../src/game/simulation.ts",
  installEventCatalog: "../src/data/events.ts",
  installEvents: "../src/game/events.ts",
  installEconomy: "../src/game/economy.ts",
  installOutcomes: "../src/game/outcomes.ts",
  installPersistence: "../src/game/persistence.ts",
  installPresentation: "../src/game/presentation.ts",
} satisfies Record<Exclude<ConstructionRole, "headless">, string>;

// Only construction-level assignments count: writes inside later actions are
// not installers. Chained headless port assignments still supply each member.
function assignedMembers(statement: ts.Statement): string[] {
  const keys: string[] = [];
  if (!ts.isExpressionStatement(statement)) return keys;
  let expression = statement.expression;
  while (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
  ) {
    if (
      ts.isPropertyAccessExpression(expression.left) &&
      ts.isIdentifier(expression.left.expression) &&
      expression.left.expression.text === "ctx"
    )
      keys.push(expression.left.name.text);
    expression = expression.right;
  }
  return keys;
}

function constructionSource(path: string): ts.SourceFile {
  return ts.createSourceFile(
    path,
    readFileSync(new URL(path, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
}

function auditConstruction(
  source = constructionSource("../src/game/createGame.ts"),
): void {
  const create = source.statements.find(
    (node) =>
      ts.isFunctionDeclaration(node) && node.name?.text === "createGame",
  );
  assert.ok(create && ts.isFunctionDeclaration(create) && create.body);
  const seed = create.body.statements
    .flatMap((statement) =>
      ts.isVariableStatement(statement)
        ? statement.declarationList.declarations
        : [],
    )
    .find((node) => ts.isIdentifier(node.name) && node.name.text === "seed");
  assert.ok(
    seed?.initializer && ts.isObjectLiteralExpression(seed.initializer),
  );
  const seeded = seed.initializer.properties.flatMap((property) => {
    if (ts.isSpreadAssignment(property)) {
      assert.ok(ts.isIdentifier(property.expression));
      if (property.expression.text === "catalog") return Object.keys(catalog);
      assert.equal(property.expression.text, "utils");
      return Object.keys(utils);
    }
    assert.ok(property.name && ts.isIdentifier(property.name));
    return [property.name.text];
  });
  assert.deepEqual(
    [...new Set(seeded)].sort(),
    Object.keys(seedMembers).sort(),
    "seed cannot mask a construction-installed member",
  );
  const calls = create.body.statements.flatMap((statement) => {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isCallExpression(statement.expression)
    )
      return [];
    const callee = statement.expression.expression;
    return ts.isIdentifier(callee) && callee.text.startsWith("install")
      ? [callee.text]
      : [];
  });
  assert.deepEqual(
    calls.sort(),
    Object.keys(installerPaths).sort(),
    "all construction installers have an audited role",
  );
  const beforeSimulation = create.body.statements.findIndex(
    (statement) => statement.getText(source) === "installSimulation(ctx);",
  );
  for (const role of [
    "headless",
    ...Object.keys(installerPaths),
  ] as ConstructionRole[]) {
    const statements: readonly ts.Statement[] =
      role === "headless"
        ? create.body.statements.slice(0, beforeSimulation)
        : (() => {
            const installer = constructionSource(
              installerPaths[role],
            ).statements.find(ts.isFunctionDeclaration);
            assert.ok(installer?.body);
            return installer.body.statements;
          })();
    assert.deepEqual(
      statements.flatMap(assignedMembers).sort(),
      Object.entries(installedMembers)
        .filter(([, [, owner]]) => owner === role)
        .map(([key]) => key)
        .sort(),
      `${role} assignments must match its complete inventory`,
    );
  }
}

test("seed and all installer roles have disjoint exhaustive construction inventories", () =>
  auditConstruction());

test("a seed function default cannot silently mask a missing installer", () => {
  const source = readFileSync(
    new URL("../src/game/createGame.ts", import.meta.url),
    "utf8",
  );
  const mutant = ts.createSourceFile(
    "createGame.ts",
    source.replace("...utils,", "...utils, buy() {},"),
    ts.ScriptTarget.Latest,
    true,
  );
  assert.throws(
    () => auditConstruction(mutant),
    /seed cannot mask a construction-installed member/,
  );
});

test("every missing installed member reports the actual member at the guard", () => {
  for (const [key, [kind]] of Object.entries(installedMembers)) {
    const game = createGame();
    assert.ok(Reflect.deleteProperty(game, key));
    assert.throws(() => assertGameAssembly(game), {
      message: `Incomplete game assembly: ${key} requires ${kind}`,
    });
  }
});

test("every missing seed and nested effect member reports the actual member", () => {
  for (const [key, kind] of Object.entries(seedMembers)) {
    const game = createGame();
    assert.ok(Reflect.deleteProperty(game, key));
    assert.throws(() => assertGameAssembly(game), {
      message: `Incomplete game assembly: ${key} requires ${kind}`,
    });
  }
  for (const key of Object.keys(createGame().FX)) {
    const game = createGame();
    assert.ok(Reflect.deleteProperty(game.FX, key));
    assert.throws(() => assertGameAssembly(game), {
      message: `Incomplete game assembly: FX.${key} requires function`,
    });
  }
  const game = createGame();
  assert.ok(Reflect.deleteProperty(game.SND, "play"));
  assert.throws(() => assertGameAssembly(game), /SND.play requires function/);
});

async function withoutInstaller(installer: string): Promise<typeof createGame> {
  const url = new URL("../src/game/createGame.ts", import.meta.url);
  const original = readFileSync(url, "utf8");
  const statement = `${installer}(ctx);`;
  assert.equal(original.split(statement).length, 2, statement);
  const source = original.replace(statement, "");
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
  return mutant.createGame;
}

for (const [installer, missing] of [
  ["installSimulation", "freshState"],
  ["installEventCatalog", "EVENTS"],
  ["installEvents", "fireEvent"],
  ["installEconomy", "buy"],
  ["installOutcomes", "endGame"],
  ["installPersistence", "codexGet"],
  ["installPresentation", "codexHTML"],
] as const)
  test(`removing ${installer} rejects its missing ${missing} before the game escapes`, async () => {
    const create = await withoutInstaller(installer);
    assert.throws(() => create(), {
      message: new RegExp(`^Incomplete game assembly: ${missing} requires `),
    });
  });
