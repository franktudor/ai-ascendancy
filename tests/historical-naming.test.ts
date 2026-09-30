import test from "node:test";
import assert from "node:assert/strict";
import {
  createHistoricalReference,
  configureStartedRun,
  cloneSerializableValue,
} from "./helpers/reference";
import {
  adaptHistoricalUpgrade,
  historicalReferenceNames,
  historicalUpgradeDefinitionNames,
  historicalUpgradeEffectsNames,
  historicalEventDefinitionNames,
  historicalEventChoiceNames,
  historicalRegionDefinitionNames,
  historicalGameUINames,
} from "./helpers/historical-naming";
import type {
  HistoricalGameUI,
  HistoricalReferencePort,
} from "./helpers/historical-naming";
import type { GameUI } from "../src/game/types";

function assertCompleteHistoricalNamingView<
  HistoricalSchema extends object,
  CurrentSchema extends object,
>(
  historicalValue: HistoricalSchema,
  currentValue: CurrentSchema,
  fieldNameMap: {
    [HistoricalFieldKey in keyof HistoricalSchema]-?: keyof CurrentSchema;
  },
  nestedFieldKeys: readonly (keyof HistoricalSchema)[] = [],
): void {
  assert.equal(
    Object.keys(currentValue).length,
    Object.keys(historicalValue).length,
    "naming does not drop or add fields",
  );
  for (const historicalFieldKey of Object.keys(
    historicalValue,
  ) as (keyof HistoricalSchema)[]) {
    const currentFieldKey = fieldNameMap[historicalFieldKey];
    assert.ok(
      Object.hasOwn(currentValue, currentFieldKey),
      `missing ${String(historicalFieldKey)} -> ${String(currentFieldKey)}`,
    );
    if (!nestedFieldKeys.includes(historicalFieldKey))
      assert.equal(
        currentValue[currentFieldKey],
        historicalValue[historicalFieldKey],
        `${String(historicalFieldKey)} retains its exact value or callable`,
      );
  }
}

test("historical naming adapters retain every catalog field and original callable without changing the VM", () => {
  const historicalReference = createHistoricalReference();
  const historicalGame: HistoricalReferencePort =
    historicalReference.historicalPort;
  const adaptedHistoricalGame = historicalReference.game;
  assert.deepEqual(
    Object.keys(adaptedHistoricalGame).sort(),
    Object.keys(historicalGame)
      .map(
        (historicalMemberName) =>
          historicalReferenceNames[
            historicalMemberName as keyof HistoricalReferencePort
          ],
      )
      .sort(),
  );
  assert.equal(adaptedHistoricalGame.state, historicalGame.state);
  assert.equal(adaptedHistoricalGame.advanceSimulation, historicalGame.tick);
  assert.equal(
    adaptedHistoricalGame.effects.adjustCompute,
    historicalGame.FX.pts,
  );
  assert.equal(adaptedHistoricalGame.appendRunLog, historicalGame.log);
  assert.equal(adaptedHistoricalGame.publishBulletin, historicalGame.bulletin);
  for (const [
    upgradeIndex,
    historicalUpgrade,
  ] of historicalGame.UPGRADES.entries()) {
    const adaptedUpgrade =
      adaptedHistoricalGame.UPGRADE_DEFINITIONS[upgradeIndex];
    assert.equal(
      adaptedHistoricalGame.UPGRADE_BY_ID[historicalUpgrade.id],
      adaptedUpgrade,
      "the lookup and array retain shared upgrade identity",
    );
    assertCompleteHistoricalNamingView(
      historicalUpgrade,
      adaptedUpgrade,
      historicalUpgradeDefinitionNames,
      ["fx"],
    );
    if (historicalUpgrade.fx)
      assertCompleteHistoricalNamingView(
        historicalUpgrade.fx,
        adaptedUpgrade.effects!,
        historicalUpgradeEffectsNames,
      );
  }
  for (const [eventIndex, historicalEvent] of historicalGame.EVENTS.entries()) {
    const adaptedEvent = adaptedHistoricalGame.EVENT_DEFINITIONS[eventIndex];
    assertCompleteHistoricalNamingView(
      historicalEvent,
      adaptedEvent,
      historicalEventDefinitionNames,
      ["choices"],
    );
    for (const [choiceIndex, historicalChoice] of (
      historicalEvent.choices ?? []
    ).entries()) {
      assertCompleteHistoricalNamingView(
        historicalChoice,
        adaptedEvent.choices![choiceIndex],
        historicalEventChoiceNames,
      );
    }
  }
  for (const [
    regionIndex,
    historicalRegion,
  ] of historicalGame.REGIONS.entries())
    assertCompleteHistoricalNamingView(
      historicalRegion,
      adaptedHistoricalGame.REGION_DEFINITIONS[regionIndex],
      historicalRegionDefinitionNames,
    );
  configureStartedRun(adaptedHistoricalGame);
  assert.equal(
    adaptedHistoricalGame.state,
    historicalGame.state,
    "state replacement remains live in the original VM",
  );
  adaptedHistoricalGame.ui.isSoundEnabled = false;
  assert.equal(
    historicalGame.ui.soundOn,
    false,
    "UI naming view delegates writes",
  );
  const stateBeforeComputeEffect = cloneSerializableValue(historicalGame.state);
  assert.equal(adaptedHistoricalGame.effects.adjustCompute(7), "Compute +7");
  assert.equal(historicalGame.state.pts, stateBeforeComputeEffect.pts + 7);
});

test("historical UI naming view preserves live own presence, undefined, enumeration and deletion", () => {
  const historicalReference = createHistoricalReference();
  const historicalUi = historicalReference.historicalPort.ui;
  const currentUi = historicalReference.game.ui;
  const originalState = historicalReference.historicalPort.state;
  const originalUpgrades = historicalReference.historicalPort.UPGRADES;
  const originalFirstUpgrade = originalUpgrades[0];
  const assertLiveUiFields = () => {
    assert.equal(historicalReference.historicalPort.ui, historicalUi);
    assert.equal(historicalReference.historicalPort.state, originalState);
    assert.equal(historicalReference.historicalPort.UPGRADES, originalUpgrades);
    assert.equal(originalUpgrades[0], originalFirstUpgrade);
    assert.deepEqual(
      Reflect.ownKeys(currentUi),
      Reflect.ownKeys(historicalUi).map((historicalKey) => {
        assert.ok(Object.hasOwn(historicalGameUINames, historicalKey));
        return historicalGameUINames[historicalKey as keyof HistoricalGameUI];
      }),
      "own keys retain historical order without absent aliases",
    );
    assert.deepEqual(
      Object.keys(currentUi),
      Object.keys(historicalUi).map(
        (historicalKey) =>
          historicalGameUINames[historicalKey as keyof HistoricalGameUI],
      ),
      "enumeration follows current historical descriptors",
    );
    for (const historicalKey of Object.keys(
      historicalGameUINames,
    ) as (keyof HistoricalGameUI)[]) {
      const currentKey = historicalGameUINames[historicalKey];
      assert.equal(
        Object.hasOwn(currentUi, currentKey),
        Object.hasOwn(historicalUi, historicalKey),
        `${historicalKey} -> ${currentKey} retains absent versus own undefined`,
      );
      assert.equal(currentKey in currentUi, historicalKey in historicalUi);
      assert.deepEqual(
        Object.getOwnPropertyDescriptor(currentUi, currentKey),
        Object.getOwnPropertyDescriptor(historicalUi, historicalKey),
        `${historicalKey} -> ${currentKey} retains its live descriptor`,
      );
    }
  };
  assertLiveUiFields();
  historicalUi.acting = undefined;
  assertLiveUiFields();
  historicalUi.codexCount = 3;
  assertLiveUiFields();
  currentUi.actionInProgress = true;
  assert.equal(historicalUi.acting, true);
  delete historicalUi.acting;
  assertLiveUiFields();
  currentUi.actionInProgress = undefined;
  assertLiveUiFields();
  delete currentUi.discoveredEndingCount;
  assert.equal(Object.hasOwn(historicalUi, "codexCount"), false);
  assertLiveUiFields();
  Object.defineProperty(historicalUi, "codexCount", {
    value: 4,
    writable: true,
    enumerable: false,
    configurable: true,
  });
  assertLiveUiFields();
  Object.defineProperty(currentUi, "discoveredEndingCount", {
    value: 5,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  assert.equal(historicalUi.codexCount, 5);
  assertLiveUiFields();
  delete currentUi.actionInProgress;
  delete historicalUi.codexCount;
  assertLiveUiFields();
  assert.throws(
    () => Reflect.set(currentUi, "unexpectedUiField", 1),
    /Unmapped current UI field: unexpectedUiField/,
  );
  assert.throws(
    () => Reflect.deleteProperty(currentUi, "unexpectedUiField"),
    /Unmapped current UI field: unexpectedUiField/,
  );
  assert.throws(
    () => Object.defineProperty(currentUi, "unexpectedUiField", { value: 1 }),
    /Unmapped current UI field: unexpectedUiField/,
  );
  Object.defineProperty(historicalUi, "unexpectedUiField", {
    value: 1,
    configurable: true,
  });
  assert.throws(
    () => Reflect.ownKeys(currentUi),
    /Unmapped historical UI field: unexpectedUiField/,
    "later unknown non-enumerable fields cannot be silently filtered",
  );
});

test("historical active briefing retains stable identity and delegates nested mutations to the VM", () => {
  const historicalReference = createHistoricalReference();
  const historicalGame = configureStartedRun(historicalReference.game);
  const historicalUi = historicalReference.historicalPort.ui;
  const currentUi = historicalGame.ui;
  historicalGame.state.brief.dec.push(
    { t: "ev", id: "warden" },
    { t: "ev", id: "fridge" },
  );
  const historicalDecisions = historicalGame.state.brief.dec;
  const historicalBriefing: NonNullable<HistoricalGameUI["brief"]> = {
    decs: historicalDecisions,
    i: 0,
    done: 0,
  };
  historicalUi.brief = historicalBriefing;
  const currentBriefing = currentUi.activeBriefing;
  assert.ok(currentBriefing);
  assert.equal(currentUi.activeBriefing, currentBriefing);
  assert.equal(currentBriefing.decisions, historicalDecisions);
  assert.equal(currentBriefing.decisions[0], historicalDecisions[0]);
  assert.deepEqual(Reflect.ownKeys(currentBriefing), [
    "decisions",
    "nextDecisionIndex",
    "completedDecisionCount",
  ]);
  currentBriefing.nextDecisionIndex = 1;
  currentBriefing.completedDecisionCount = 1;
  assert.equal(historicalBriefing.i, 1);
  assert.equal(historicalBriefing.done, 1);
  historicalBriefing.i = 0;
  historicalBriefing.done = 0;
  assert.equal(currentBriefing.nextDecisionIndex, 0);
  assert.equal(currentBriefing.completedDecisionCount, 0);
  historicalGame.nextDecision(false);
  assert.equal(
    historicalBriefing.i,
    1,
    "the real VM updates the viewed object",
  );
  assert.equal(currentBriefing.nextDecisionIndex, 1);
  assert.equal(currentUi.activeBriefing, currentBriefing);
  assert.equal(historicalUi.brief, historicalBriefing);
  currentBriefing.decisions.push({ t: "eval" });
  assert.equal(historicalDecisions.at(-1), currentBriefing.decisions.at(-1));
  const replacementDecisions: NonNullable<
    GameUI["activeBriefing"]
  >["decisions"] = [{ t: "ev", id: "fridge" }];
  currentBriefing.decisions = replacementDecisions;
  assert.equal(historicalBriefing.decs, replacementDecisions);
  historicalBriefing.decs = historicalDecisions;
  assert.equal(currentBriefing.decisions, historicalDecisions);
  const replacementBriefing = { decs: historicalDecisions, i: 2, done: 1 };
  historicalUi.brief = replacementBriefing;
  const replacementView = currentUi.activeBriefing;
  assert.ok(replacementView);
  assert.notEqual(replacementView, currentBriefing);
  assert.equal(currentUi.activeBriefing, replacementView);
  currentUi.activeBriefing = currentBriefing;
  assert.equal(
    historicalUi.brief,
    historicalBriefing,
    "setter unwraps its exact VM object",
  );
  assert.equal(currentUi.activeBriefing, currentBriefing);
  Object.defineProperty(currentUi, "activeBriefing", {
    value: replacementView,
    configurable: true,
    writable: true,
    enumerable: true,
  });
  assert.equal(historicalUi.brief, replacementBriefing);
  assert.equal(currentUi.activeBriefing, replacementView);
  assert.equal(
    Object.getOwnPropertyDescriptor(currentUi, "activeBriefing")?.value,
    replacementView,
  );
  currentUi.activeBriefing = null;
  assert.equal(historicalUi.brief, null);
  currentUi.activeBriefing = undefined;
  assert.equal(historicalUi.brief, undefined);
  assert.equal(Object.hasOwn(currentUi, "activeBriefing"), true);
  delete currentUi.activeBriefing;
  assert.equal(Object.hasOwn(historicalUi, "brief"), false);
  historicalUi.brief = historicalBriefing;
  assert.equal(currentUi.activeBriefing, currentBriefing);
});

test("current-authored briefing remains a live original object when the VM writes historical names", () => {
  const historicalReference = createHistoricalReference();
  const historicalUi = historicalReference.historicalPort.ui;
  const currentUi = historicalReference.game.ui;
  const currentBriefing: NonNullable<GameUI["activeBriefing"]> = {
    decisions: [{ t: "ev", id: "warden" }],
    nextDecisionIndex: 0,
    completedDecisionCount: 0,
  };
  currentUi.activeBriefing = currentBriefing;
  const historicalBriefing = historicalUi.brief;
  assert.ok(historicalBriefing);
  assert.equal(
    currentUi.activeBriefing,
    currentBriefing,
    "setter must not replace its input with a snapshot",
  );
  assert.equal(historicalBriefing.decs, currentBriefing.decisions);
  historicalBriefing.i = 1;
  historicalBriefing.done = 1;
  assert.equal(currentBriefing.nextDecisionIndex, 1);
  assert.equal(currentBriefing.completedDecisionCount, 1);
  currentBriefing.nextDecisionIndex = 0;
  assert.equal(historicalBriefing.i, 0);
  const replacementDecisions = [{ t: "eval" } as const];
  historicalBriefing.decs = replacementDecisions;
  assert.equal(currentBriefing.decisions, replacementDecisions);
  currentUi.activeBriefing = null;
  currentUi.activeBriefing = currentBriefing;
  assert.equal(historicalUi.brief, historicalBriefing);
  assert.equal(currentUi.activeBriefing, currentBriefing);
  assert.throws(
    () => Reflect.set(currentUi, "activeBriefing", 0),
    /briefing must be an object/,
  );
  assert.throws(
    () =>
      Reflect.set(currentUi, "activeBriefing", {
        ...currentBriefing,
        decisions: "not an array",
      }),
    /briefing decisions must be an array/,
  );
  assert.throws(
    () =>
      Reflect.set(currentUi, "activeBriefing", {
        ...currentBriefing,
        unexpectedBriefingField: 1,
      }),
    /Unmapped current briefing field: unexpectedBriefingField/,
  );
  assert.equal(
    historicalUi.brief,
    historicalBriefing,
    "rejected writes retain the live object",
  );
});

test("historical naming adapters reject unexpected fields rather than silently filtering them", () => {
  // This deliberately malformed test input must fail at the naming boundary.
  const malformedHistoricalUpgrade = {
    ...createHistoricalReference().historicalPort.UPGRADES[0],
    unexpectedCatalogField: 1,
  };
  assert.throws(
    () => adaptHistoricalUpgrade(malformedHistoricalUpgrade),
    /Unmapped historical field: unexpectedCatalogField/,
  );
});
