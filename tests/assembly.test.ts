import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import typescript from "typescript";
import { createGame } from "../src/game/createGame";
import {
  assertGameAssembly,
  installedMemberInventory,
  seedMemberInventory,
} from "../src/game/assembly";
import type { ConstructionRole } from "../src/game/assembly";
import * as catalog from "../src/data/catalog";
import * as utilities from "../src/game/utils";

const installerSourcePaths = {
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
function collectAssignedContextMembers(
  constructionStatement: typescript.Statement,
  contextIdentifierName: string,
): string[] {
  const assignedMemberNames: string[] = [];
  if (!typescript.isExpressionStatement(constructionStatement))
    return assignedMemberNames;
  let assignmentExpression = constructionStatement.expression;
  while (
    typescript.isBinaryExpression(assignmentExpression) &&
    assignmentExpression.operatorToken.kind ===
      typescript.SyntaxKind.EqualsToken
  ) {
    if (
      typescript.isPropertyAccessExpression(assignmentExpression.left) &&
      typescript.isIdentifier(assignmentExpression.left.expression) &&
      assignmentExpression.left.expression.text === contextIdentifierName
    )
      assignedMemberNames.push(assignmentExpression.left.name.text);
    assignmentExpression = assignmentExpression.right;
  }
  return assignedMemberNames;
}

function readConstructionSourceFile(sourcePath: string): typescript.SourceFile {
  return typescript.createSourceFile(
    sourcePath,
    readFileSync(new URL(sourcePath, import.meta.url), "utf8"),
    typescript.ScriptTarget.Latest,
    true,
  );
}

function assertConstructionInventory(
  constructionSourceFile = readConstructionSourceFile(
    "../src/game/createGame.ts",
  ),
): void {
  const gameFactoryDeclaration = constructionSourceFile.statements.find(
    (syntaxNode) =>
      typescript.isFunctionDeclaration(syntaxNode) &&
      syntaxNode.name?.text === "createGame",
  );
  assert.ok(
    gameFactoryDeclaration &&
      typescript.isFunctionDeclaration(gameFactoryDeclaration) &&
      gameFactoryDeclaration.body,
  );
  const assemblySeedDeclaration = gameFactoryDeclaration.body.statements
    .flatMap((constructionStatement) =>
      typescript.isVariableStatement(constructionStatement)
        ? constructionStatement.declarationList.declarations
        : [],
    )
    .find(
      (syntaxNode) =>
        typescript.isIdentifier(syntaxNode.name) &&
        syntaxNode.name.text === "assemblySeed",
    );
  assert.ok(
    assemblySeedDeclaration?.initializer &&
      typescript.isObjectLiteralExpression(assemblySeedDeclaration.initializer),
  );
  const seededMemberNames =
    assemblySeedDeclaration.initializer.properties.flatMap((seedProperty) => {
      if (typescript.isSpreadAssignment(seedProperty)) {
        assert.ok(typescript.isIdentifier(seedProperty.expression));
        if (seedProperty.expression.text === "catalog")
          return Object.keys(catalog);
        assert.equal(seedProperty.expression.text, "utilities");
        return Object.keys(utilities);
      }
      assert.ok(
        seedProperty.name && typescript.isIdentifier(seedProperty.name),
      );
      return [seedProperty.name.text];
    });
  assert.deepEqual(
    [...new Set(seededMemberNames)].sort(),
    Object.keys(seedMemberInventory).sort(),
    "seed cannot mask a construction-installed member",
  );
  const installerCallNames = gameFactoryDeclaration.body.statements.flatMap(
    (constructionStatement) => {
      if (
        !typescript.isExpressionStatement(constructionStatement) ||
        !typescript.isCallExpression(constructionStatement.expression)
      )
        return [];
      const installerCallee = constructionStatement.expression.expression;
      return typescript.isIdentifier(installerCallee) &&
        installerCallee.text.startsWith("install")
        ? [installerCallee.text]
        : [];
    },
  );
  assert.deepEqual(
    installerCallNames.sort(),
    Object.keys(installerSourcePaths).sort(),
    "all construction installers have an audited role",
  );
  const simulationInstallerStatementIndex =
    gameFactoryDeclaration.body.statements.findIndex(
      (constructionStatement) =>
        constructionStatement.getText(constructionSourceFile) ===
        "installSimulation(gameContext);",
    );
  for (const constructionRole of [
    "headless",
    ...Object.keys(installerSourcePaths),
  ] as ConstructionRole[]) {
    const constructionStatements: readonly typescript.Statement[] =
      constructionRole === "headless"
        ? gameFactoryDeclaration.body.statements.slice(
            0,
            simulationInstallerStatementIndex,
          )
        : (() => {
            const installerDeclaration = readConstructionSourceFile(
              installerSourcePaths[constructionRole],
            ).statements.find(typescript.isFunctionDeclaration);
            assert.ok(installerDeclaration?.body);
            return installerDeclaration.body.statements;
          })();
    assert.deepEqual(
      constructionStatements
        .flatMap((constructionStatement) =>
          collectAssignedContextMembers(
            constructionStatement,
            constructionRole === "installPresentation"
              ? "context"
              : "gameContext",
          ),
        )
        .sort(),
      Object.entries(installedMemberInventory)
        .filter(([, [, memberOwner]]) => memberOwner === constructionRole)
        .map(([memberName]) => memberName)
        .sort(),
      `${constructionRole} assignments must match its complete inventory`,
    );
  }
}

test("seed and all installer roles have disjoint exhaustive construction inventories", () =>
  assertConstructionInventory());

test("a seed function default cannot silently mask a missing installer", () => {
  const factorySourceText = readFileSync(
    new URL("../src/game/createGame.ts", import.meta.url),
    "utf8",
  );
  assert.equal(
    factorySourceText.split("...utilities,").length,
    2,
    "one exact seed mutation target",
  );
  const mutatedFactorySourceFile = typescript.createSourceFile(
    "createGame.ts",
    factorySourceText.replace(
      "...utilities,",
      "...utilities, purchaseUpgrade() {},",
    ),
    typescript.ScriptTarget.Latest,
    true,
  );
  assert.throws(
    () => assertConstructionInventory(mutatedFactorySourceFile),
    /seed cannot mask a construction-installed member/,
  );
});

test("every missing installed member reports the actual member at the guard", () => {
  for (const [memberName, [memberKind]] of Object.entries(
    installedMemberInventory,
  )) {
    const migratedGame = createGame();
    assert.ok(Reflect.deleteProperty(migratedGame, memberName));
    assert.throws(() => assertGameAssembly(migratedGame), {
      message: `Incomplete game assembly: ${memberName} requires ${memberKind}`,
    });
  }
});

test("every missing seed and nested effect member reports the actual member", () => {
  for (const [memberName, memberKind] of Object.entries(seedMemberInventory)) {
    const migratedGame = createGame();
    assert.ok(Reflect.deleteProperty(migratedGame, memberName));
    assert.throws(() => assertGameAssembly(migratedGame), {
      message: `Incomplete game assembly: ${memberName} requires ${memberKind}`,
    });
  }
  for (const memberName of Object.keys(createGame().effects)) {
    const migratedGame = createGame();
    assert.ok(Reflect.deleteProperty(migratedGame.effects, memberName));
    assert.throws(() => assertGameAssembly(migratedGame), {
      message: `Incomplete game assembly: effects.${memberName} requires function`,
    });
  }
  const migratedGame = createGame();
  assert.ok(Reflect.deleteProperty(migratedGame.soundController, "playCue"));
  assert.throws(
    () => assertGameAssembly(migratedGame),
    /soundController.playCue requires function/,
  );
});

async function importGameFactoryWithoutInstaller(
  omittedInstallerName: string,
): Promise<typeof createGame> {
  const gameFactoryUrl = new URL("../src/game/createGame.ts", import.meta.url);
  const originalFactorySource = readFileSync(gameFactoryUrl, "utf8");
  const installerStatementText = `${omittedInstallerName}(gameContext);`;
  assert.equal(
    originalFactorySource.split(installerStatementText).length,
    2,
    installerStatementText,
  );
  const mutatedFactorySource = originalFactorySource.replace(
    installerStatementText,
    "",
  );
  const resolvedModuleSource = mutatedFactorySource.replace(
    /from ["'](\.\.?\/[^"']+)["']/g,
    (_importMatch: string, moduleImportPath: string) =>
      `from ${JSON.stringify(new URL(moduleImportPath + ".ts", gameFactoryUrl).href)}`,
  );
  const transpiledModuleCode = typescript.transpileModule(
    resolvedModuleSource.replace(
      'from "vue"',
      `from ${JSON.stringify(import.meta.resolve("vue"))}`,
    ),
    {
      compilerOptions: {
        target: typescript.ScriptTarget.ES2022,
        module: typescript.ModuleKind.ESNext,
      },
    },
  ).outputText;
  const mutatedFactoryModule = (await import(
    `data:text/javascript;base64,${Buffer.from(transpiledModuleCode).toString("base64")}`
  )) as { createGame: typeof createGame };
  return mutatedFactoryModule.createGame;
}

for (const [installerName, missingMemberName] of [
  ["installSimulation", "createInitialState"],
  ["installEventCatalog", "EVENT_DEFINITIONS"],
  ["installEvents", "triggerRandomEvent"],
  ["installEconomy", "purchaseUpgrade"],
  ["installOutcomes", "endGame"],
  ["installPersistence", "getEndingDiscoveryCounts"],
  ["installPresentation", "renderCodexHtml"],
] as const)
  test(`removing ${installerName} rejects its missing ${missingMemberName} before the game escapes`, async () => {
    const createMutatedGame =
      await importGameFactoryWithoutInstaller(installerName);
    assert.throws(() => createMutatedGame(), {
      message: new RegExp(
        `^Incomplete game assembly: ${missingMemberName} requires `,
      ),
    });
  });
