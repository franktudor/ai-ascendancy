import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import * as utilities from "../src/game/utils";
import { readFileSync } from "node:fs";
import typescript from "typescript";

test("effect signature parameters distinguish proportional adoption and percentage inputs", () => {
  const sourceFile = typescript.createSourceFile(
    "types.ts",
    readFileSync(new URL("../src/game/types.ts", import.meta.url), "utf8"),
    typescript.ScriptTarget.Latest,
    true,
  );
  const expectedParameterNames = new Map([
    ["Effects.adjustAdoptionInRegions", ["regionIds", "adoptionFraction"]],
    ["Effects.adjustGlobalAdoption", ["adoptionFraction"]],
    ["RulesAPI.adjustRegionAdoption", ["regionState", "adoptionFraction"]],
    ["Effects.adjustContainmentResearchSpeed", ["researchSpeedDeltaPercent"]],
  ]);
  const actualParameterNames = new Map<string, string[]>();
  for (const declaration of sourceFile.statements) {
    if (!typescript.isInterfaceDeclaration(declaration)) continue;
    for (const member of declaration.members) {
      if (!typescript.isMethodSignature(member)) continue;
      const signatureName: string = `${declaration.name.text}.${member.name.getText(sourceFile)}`;
      if (expectedParameterNames.has(signatureName)) {
        assert.equal(
          actualParameterNames.has(signatureName),
          false,
          `Duplicate targeted method signature: ${signatureName}`,
        );
        actualParameterNames.set(
          signatureName,
          member.parameters.map((parameter) =>
            parameter.name.getText(sourceFile),
          ),
        );
      }
    }
  }
  assert.deepEqual(actualParameterNames, expectedParameterNames);

  const migratedGame = createGame();
  const regionState = migratedGame.state.regions[0];
  regionState.a = 0.5;
  migratedGame.adjustRegionAdoption(regionState, 0.1);
  assert.equal(regionState.a, 0.55);
  regionState.a = 0.5;
  migratedGame.adjustRegionAdoption(regionState, -0.1);
  assert.equal(regionState.a, 0.45);
});

test("formatting utilities expose descriptive names without changing their output", () => {
  assert.ok(
    "formatCompactNumber" in utilities,
    "compact number formatter has a descriptive export",
  );
  assert.ok(
    "formatElapsedTime" in utilities,
    "elapsed-time formatter has a descriptive export",
  );
  assert.ok(
    "escapeHtml" in utilities,
    "HTML escaping has a descriptive export",
  );
  assert.ok(
    "joinDetailLabels" in utilities,
    "detail-label joining has a descriptive export",
  );
  assert.ok(
    "formatSignedInteger" in utilities,
    "signed-integer formatter has a descriptive export",
  );
  assert.equal(utilities.formatCompactNumber(12345), "12.3k");
  assert.equal(utilities.formatElapsedTime(3661), "01:01:01");
  assert.equal(
    utilities.escapeHtml('<AI & "human">'),
    "&lt;AI &amp; &quot;human&quot;&gt;",
  );
  assert.equal(
    utilities.joinDetailLabels("AI", "", null, 0, "human"),
    "AI · human",
  );
  assert.equal(utilities.formatSignedInteger(1.7), "+2");
  assert.equal(utilities.formatSignedInteger(-1.7), "-2");
  const migratedGame = createGame();
  assert.equal(migratedGame.formatCompactNumber(12345), "12.3k");
  assert.equal(migratedGame.formatElapsedTime(3661), "01:01:01");
});
