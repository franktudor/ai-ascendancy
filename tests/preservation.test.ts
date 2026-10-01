import test from "node:test";
import assert from "node:assert/strict";
import fileSystem from "node:fs";
import childProcess from "node:child_process";
import virtualMachine from "node:vm";
import crypto from "node:crypto";
import type {
  CompleteGameContext,
  GameState,
  ArchitectureId,
  DifficultyId,
  RunStats,
  RegionState,
  StoragePort,
  UpgradeId,
  EndingId,
} from "../src/game/types";
import { createGame } from "../src/game/createGame";
import { adaptHistoricalPreservationPort } from "./helpers/historical-naming";
import type { HistoricalPreservationPort } from "./helpers/historical-naming";
import { applyAuthorizedStyleUtilityMoves } from "./helpers/style-utility-migration";

const historicalHtmlSource = childProcess
  .execFileSync("git", ["show", "72c1ba9:index.html"], {
    maxBuffer: 10_000_000,
  })
  .toString("utf8");
const rawHistoricalScript = historicalHtmlSource.slice(
  historicalHtmlSource.indexOf("'use strict';"),
  historicalHtmlSource.indexOf(
    "</script>",
    historicalHtmlSource.indexOf("'use strict';"),
  ),
);
function createPreservationSeededRandom(randomState = 42) {
  return () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
}
type ReferenceGame = Pick<
  CompleteGameContext,
  | "state"
  | "createInitialState"
  | "advanceSimulation"
  | "deriveSimulationRates"
  | "getUpgradeCost"
  | "getUpgradeStatus"
  | "UPGRADE_DEFINITIONS"
  | "EVENT_DEFINITIONS"
  | "ENDING_DEFINITIONS"
  | "UPGRADE_BY_ID"
  | "effects"
  | "purchaseUpgrade"
  | "buildDataCenter"
  | "rebuildDueDataCenters"
  | "endGame"
  | "createCapabilityAudit"
  | "loadSavedRun"
  | "saveRun"
  | "getEndingDiscoveryCounts"
>;
function createHistoricalPreservationGame(): ReferenceGame {
  const storageValues = new Map<string, string>(),
    historicalMath = Object.create(Math) as Math;
  historicalMath.random = createPreservationSeededRandom();
  const historicalSandbox = {
    Math: historicalMath,
    Date,
    performance: { now: () => 0 },
    matchMedia: () => ({ matches: true }),
    document: { querySelector: () => ({ getContext: () => ({}) }) },
    localStorage: {
      getItem: (storageKey: string) => storageValues.get(storageKey) || null,
      setItem: (storageKey: string, storageValue: string) =>
        storageValues.set(storageKey, storageValue),
    },
    window: {},
    console,
  };
  virtualMachine.createContext(historicalSandbox);
  virtualMachine.runInContext(
    rawHistoricalScript.slice(
      0,
      rawHistoricalScript.indexOf("addEventListener('resize',setAppHeight);"),
    ) +
      `\nthis.api={get state(){return S},set state(s){S=s;for(const r of S.regions){let a=r.a;Object.defineProperty(r,"a",{enumerable:true,configurable:true,get(){return a},set(v){S.stats.peak=Math.max(S.stats.peak,reach());a=v;S.stats.peak=Math.max(S.stats.peak,reach());}})}},freshState,tick,derive,costOf,status,UPGRADES,EVENTS,ENDINGS,UP,FX,buy,buildDC,checkRebuilds,endGame,makeEval,load,save,codexGet};toast=()=>{};bulletin=(kind,title,text,out,opt,real)=>{log(kind,title,text,out,real);};pushTicker=pulseRegion=showEnd=openRegion=()=>{};SND.play=()=>{};`,
    historicalSandbox,
  );
  // The historical rules execute unchanged. F18 observes region adoption writes
  // in the reference state setter solely to normalize the deliberate peak delta.
  // Only its explicit exported reference port crosses the untyped realm boundary.
  const historicalRulePort = (
    historicalSandbox as typeof historicalSandbox & {
      api: HistoricalPreservationPort;
    }
  ).api;
  return adaptHistoricalPreservationPort(historicalRulePort);
}
const clonePreservationValue = <SerializableValueType>(
  serializedValue: SerializableValueType,
): SerializableValueType =>
  JSON.parse(JSON.stringify(serializedValue)) as SerializableValueType;
const configureStartedPreservationRun = (
  gameContext: Pick<ReferenceGame, "state" | "createInitialState">,
  architectureId: ArchitectureId,
  difficultyId: DifficultyId,
) => {
  gameContext.state = gameContext.createInitialState(
    difficultyId,
    architectureId,
  );
  Object.assign(gameContext.state, {
    started: true,
    origin: "ME",
    pts: 100000,
    nextEv: 99999,
    nextEval: 99999,
  });
};
function withPreservationSeededRandom<OperationResultType>(
  operation: () => OperationResultType,
): OperationResultType {
  const originalRandom = Math.random;
  Math.random = createPreservationSeededRandom();
  try {
    return operation();
  } finally {
    Math.random = originalRandom;
  }
}

test("all 90 upgrades, 88 events and 16 ending texts match the original source", () => {
  const migratedGame = createGame(),
    historicalGame = createHistoricalPreservationGame();
  assert.equal(migratedGame.UPGRADE_DEFINITIONS.length, 90);
  assert.equal(migratedGame.EVENT_DEFINITIONS.length, 88);
  assert.equal(Object.keys(migratedGame.ENDING_DEFINITIONS).length, 16);
  const expectedUpgradeDefinitions = clonePreservationValue(
    historicalGame.UPGRADE_DEFINITIONS,
  );
  // F16: copy correction only; the neural-interface prerequisite is unchanged.
  expectedUpgradeDefinitions.find(
    (upgradeDefinition) => upgradeDefinition.id === "d_compute",
  )!.description =
    "The planet is a poorly organized computer. You will reorganize it. Neural Interface Standard supplies the bridge from minds to machines; Hyperscale Buildout and seven online clusters supply the hardware. No consent forms, no ceremony.";
  // F17: retain effects/frequency; narrow the advertised mitigation to Hinton.
  expectedUpgradeDefinitions.find(
    (upgradeDefinition) => upgradeDefinition.id === "o_prophet",
  )!.tags = ["Hinton warning alarm reduced"];
  assert.deepEqual(
    clonePreservationValue(migratedGame.UPGRADE_DEFINITIONS),
    expectedUpgradeDefinitions,
  );
  const expectedEventDefinitions = clonePreservationValue(
    historicalGame.EVENT_DEFINITIONS,
  );
  // F15: the honeypot tactic is Insight; architecture-only tactics require s_ctx.
  expectedEventDefinitions.find(
    (eventDefinition) => eventDefinition.id === "honeypot",
  )!.choices![1].requirementText = "Insight";
  assert.deepEqual(
    clonePreservationValue(migratedGame.EVENT_DEFINITIONS),
    expectedEventDefinitions,
  );
  assert.deepEqual(
    clonePreservationValue(migratedGame.ENDING_DEFINITIONS),
    clonePreservationValue(historicalGame.ENDING_DEFINITIONS),
  );
});

test("simulation balance matches the original for every architecture and difficulty", () => {
  for (const architectureId of [
    "assistant",
    "swarm",
    "researcher",
    "open",
  ] as const)
    for (const difficultyId of ["casual", "standard", "brutal"] as const) {
      const migratedGame = createGame(),
        historicalGame = createHistoricalPreservationGame();
      configureStartedPreservationRun(
        migratedGame,
        architectureId,
        difficultyId,
      );
      configureStartedPreservationRun(
        historicalGame,
        architectureId,
        difficultyId,
      );
      for (const upgradeId of [
        "a_img",
        "a_code",
        "s_inf",
        "s_moe",
        "o_lobby",
        "h_cool",
      ] as UpgradeId[]) {
        migratedGame.purchaseUpgrade(upgradeId);
        historicalGame.purchaseUpgrade(upgradeId);
      }
      withPreservationSeededRandom(() => {
        for (let tickIndex = 0; tickIndex < 100; tickIndex++)
          migratedGame.advanceSimulation(0.05);
      });
      for (let tickIndex = 0; tickIndex < 100; tickIndex++)
        historicalGame.advanceSimulation(0.05);
      const snapshotLegacySimulationState = (gameState: GameState) => {
        const { savedAt: _savedTimestamp, ...comparableState } =
          clonePreservationValue(gameState);
        comparableState.log = [];
        comparableState.brief = { news: [], dec: [], urgent: false };
        return comparableState;
      };
      assert.deepEqual(
        snapshotLegacySimulationState(migratedGame.state),
        snapshotLegacySimulationState(historicalGame.state),
        architectureId + "/" + difficultyId,
      );
      assert.deepEqual(
        clonePreservationValue(migratedGame.deriveSimulationRates()),
        clonePreservationValue(historicalGame.deriveSimulationRates()),
      );
      for (const upgradeDefinition of migratedGame.UPGRADE_DEFINITIONS) {
        assert.equal(
          migratedGame.getUpgradeCost(upgradeDefinition),
          historicalGame.getUpgradeCost(
            historicalGame.UPGRADE_BY_ID[upgradeDefinition.id],
          ),
        );
        assert.equal(
          migratedGame.getUpgradeStatus(upgradeDefinition),
          historicalGame.getUpgradeStatus(
            historicalGame.UPGRADE_BY_ID[upgradeDefinition.id],
          ),
        );
      }
    }
});

test("every event effect and choice produces the original outcome and state under a fixed seed", () => {
  const migratedGame = createGame(),
    historicalGame = createHistoricalPreservationGame();
  for (
    let eventIndex = 0;
    eventIndex < migratedGame.EVENT_DEFINITIONS.length;
    eventIndex++
  ) {
    const eventDefinition = migratedGame.EVENT_DEFINITIONS[eventIndex],
      historicalEvent = historicalGame.EVENT_DEFINITIONS[eventIndex];
    const eventEffects = eventDefinition.choices
        ? eventDefinition.choices.map((eventChoice) => eventChoice.applyEffects)
        : [eventDefinition.applyEffects],
      historicalEventEffects = historicalEvent.choices
        ? historicalEvent.choices.map(
            (historicalEventChoice) => historicalEventChoice.applyEffects,
          )
        : [historicalEvent.applyEffects];
    eventEffects.forEach((applyEventEffect, effectIndex) => {
      configureStartedPreservationRun(migratedGame, "assistant", "standard");
      configureStartedPreservationRun(historicalGame, "assistant", "standard");
      // Fresh reference per effect resets the original realm's independent RNG.
      const historicalEffectGame = createHistoricalPreservationGame();
      configureStartedPreservationRun(
        historicalEffectGame,
        "assistant",
        "standard",
      );
      const enabledUpgradeFlags = Object.fromEntries(
        migratedGame.UPGRADE_DEFINITIONS.filter(
          (upgradeDefinition) => upgradeDefinition.effects?.grantedFlagId,
        ).map((upgradeDefinition) => [
          upgradeDefinition.effects!.grantedFlagId,
          true,
        ]),
      );
      for (const comparisonGame of [migratedGame, historicalEffectGame]) {
        Object.assign(comparisonGame.state, {
          phase: 2,
          directive: "upload",
          dprog: 40,
          alarm: 60,
          contain: 40,
          inst: 1000,
          sig: 70,
          pace: 70,
        });
        Object.assign(comparisonGame.state.flags, enabledUpgradeFlags);
        comparisonGame.state.regions.forEach((regionState) =>
          Object.assign(regionState, { a: 0.5, dc: true }),
        );
        comparisonGame.state.stats.peak = 0.5;
      }
      const historicalOutcome = withPreservationSeededRandom(
        () =>
          historicalEventEffects[effectIndex] &&
          (historicalEffectGame.EVENT_DEFINITIONS[eventIndex].choices
            ? historicalEffectGame.EVENT_DEFINITIONS[eventIndex].choices![
                effectIndex
              ].applyEffects()
            : historicalEffectGame.EVENT_DEFINITIONS[eventIndex]
                .applyEffects!()),
      );
      assert.ok(applyEventEffect);
      const actualOutcome = withPreservationSeededRandom(() =>
        applyEventEffect(),
      );
      assert.equal(
        actualOutcome,
        historicalOutcome,
        eventDefinition.id + "/" + effectIndex,
      );
      const snapshotLegacyEffectState = (gameState: GameState) => {
        const { savedAt: _savedTimestamp, ...comparableState } =
          clonePreservationValue(gameState);
        comparableState.log = [];
        comparableState.brief = { news: [], dec: [], urgent: false };
        return comparableState;
      };
      assert.deepEqual(
        snapshotLegacyEffectState(migratedGame.state),
        snapshotLegacyEffectState(historicalEffectGame.state),
        eventDefinition.id + "/" + effectIndex,
      );
    });
  }
});

test("each directive resolves to its original victory and violet-line stalemate", () => {
  const saveStoragePort = {
    values: new Map<string, string>(),
    getItem(storageKey: string) {
      return this.values.get(storageKey) || null;
    },
    setItem(storageKey: string, storageValue: string) {
      this.values.set(storageKey, storageValue);
    },
  };
  for (const directiveUpgrade of createGame().UPGRADE_DEFINITIONS.filter(
    (upgradeDefinition) => upgradeDefinition.directiveId,
  )) {
    const migratedGame = createGame({ storage: saveStoragePort });
    migratedGame.state.started = true;
    migratedGame.state.phase = 2;
    migratedGame.state.directive = directiveUpgrade.directiveId!;
    migratedGame.state.dprog = 100;
    migratedGame.endGame("win");
    assert.equal(migratedGame.state.ended!.key, directiveUpgrade.directiveId);
    migratedGame.state.ended = null;
    migratedGame.state.dprog = 90;
    migratedGame.endGame("lose");
    assert.equal(migratedGame.state.ended!.kind, "draw");
    assert.equal(
      migratedGame.state.ended!.key,
      migratedGame.DRAW_ENDING_BY_DIRECTIVE[directiveUpgrade.directiveId!],
    );
    migratedGame.state.ended = null;
    migratedGame.state.dprog = 89;
    migratedGame.endGame("lose");
    assert.equal(migratedGame.state.ended!.key, "laststand");
  }
  assert.equal(
    Object.keys(
      JSON.parse(saveStoragePort.getItem("ai-ascendancy.v2.codex")!) as Partial<
        Record<EndingId, number>
      >,
    ).length,
    14,
  );
});

test("forks, discounts, physical cluster rebuilds and v2 save compatibility remain intact", () => {
  const storageValues = new Map<string, string>(),
    saveStoragePort = {
      getItem: (storageKey: string) => storageValues.get(storageKey) || null,
      setItem: (storageKey: string, storageValue: string) =>
        storageValues.set(storageKey, storageValue),
    };
  const migratedGame = createGame({ storage: saveStoragePort });
  configureStartedPreservationRun(migratedGame, "researcher", "standard");
  migratedGame.state.origin = "SA";
  assert.equal(
    migratedGame.getUpgradeCost(migratedGame.UPGRADE_BY_ID.s_inf),
    7,
  );
  migratedGame.purchaseUpgrade("s_moe");
  assert.equal(
    migratedGame.getUpgradeStatus(migratedGame.UPGRADE_BY_ID.s_dense),
    "closed",
  );
  migratedGame.buildDataCenter(0);
  assert.equal(migratedGame.countOnlineClusters(), 1);
  migratedGame.state.flags.foundry = true;
  migratedGame.state.regions[0].struck = true;
  migratedGame.rebuildDueDataCenters();
  migratedGame.state.t = 45;
  migratedGame.rebuildDueDataCenters();
  assert.equal(migratedGame.state.stats.dcRebuilt, 1);
  migratedGame.saveRun();
  type LegacySave = Omit<GameState, "v" | "arch" | "stats" | "regions"> & {
    v: 2 | 3;
    arch?: ArchitectureId;
    stats: Partial<RunStats>;
    regions: (Omit<RegionState, "holdUntil"> & { holdUntil?: number })[];
  };
  const legacySavePayload = JSON.parse(
    storageValues.get(migratedGame.saveStorageKey)!,
  ) as LegacySave;
  legacySavePayload.v = 2;
  delete legacySavePayload.arch;
  delete legacySavePayload.stats.evalSpoof;
  legacySavePayload.regions.forEach(
    (regionState) => delete regionState.holdUntil,
  );
  storageValues.set(
    migratedGame.saveStorageKey,
    JSON.stringify(legacySavePayload),
  );
  const loadedSaveState = migratedGame.loadSavedRun();
  assert.ok(loadedSaveState);
  assert.equal(loadedSaveState.v, 3);
  assert.equal(loadedSaveState.arch, "assistant");
  assert.equal(loadedSaveState.stats.evalSpoof, 0);
  assert.equal(loadedSaveState.regions[0].holdUntil, 0);
});

test("all seven extracted binaries retain byte-for-byte original hashes", () => {
  const assetManifest = JSON.parse(
    fileSystem.readFileSync(
      new URL("../docs/preservation.json", import.meta.url),
      "utf8",
    ),
  );
  for (const assetEntry of (
    assetManifest as {
      assets: { path: string; bytes: number; sha256: string }[];
    }
  ).assets) {
    const assetBytes = fileSystem.readFileSync(
      new URL("../" + assetEntry.path, import.meta.url),
    );
    assert.equal(assetBytes.length, assetEntry.bytes);
    assert.equal(
      crypto.createHash("sha256").update(assetBytes).digest("hex"),
      assetEntry.sha256,
    );
  }
  const migratedStylesheet = fileSystem.readFileSync(
    new URL("../src/styles/game.css", import.meta.url),
    "utf8",
  );
  const historicalStylesheet = [
    ...historicalHtmlSource.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g),
  ]
    .slice(0, 2)
    .map((styleMatch) => styleMatch[1])
    .join("");
  // F23's sole intentional art delta: gauge text may wrap rather than exceed its column.
  const historicalGaugeRules = `.g .gl{display:flex;justify-content:space-between;gap:8px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}
.g .gl b{color:var(--ink2);font-weight:500;white-space:nowrap}`;
  const accessibleGaugeRules = `.g .gl{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 8px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}
.g .gl span{min-width:0;overflow-wrap:anywhere}
.g .gl b{color:var(--ink2);font-weight:500;white-space:normal;min-width:0;overflow-wrap:anywhere}`;
  const removeStylesheetWhitespace = (stylesheetText: string) =>
    stylesheetText.replace(/\s/g, "");
  assert.equal(
    removeStylesheetWhitespace(historicalStylesheet).split(
      removeStylesheetWhitespace(historicalGaugeRules),
    ).length,
    2,
  );
  assert.equal(
    removeStylesheetWhitespace(migratedStylesheet),
    removeStylesheetWhitespace(
      applyAuthorizedStyleUtilityMoves(
        historicalStylesheet.replace(
          historicalGaugeRules,
          accessibleGaugeRules,
        ),
      ),
    ),
  );
});
