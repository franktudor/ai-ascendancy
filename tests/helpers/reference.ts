import { execFileSync } from "node:child_process";
import virtualMachine from "node:vm";
import assert from "node:assert/strict";
import {
  applyVerifiedHistoricalDeltas,
  verifiedDeltas,
} from "./reference-deltas";
import type { VerifiedDelta } from "./reference-deltas";
import { adaptHistoricalReferencePort } from "./historical-naming";
import type { HistoricalReferencePort } from "./historical-naming";
import type {
  CompleteGameContext,
  GameState,
  ArchitectureId,
  DifficultyId,
  RuntimeContext,
} from "../../src/game/types";

export const original = execFileSync("git", ["show", "72c1ba9:index.html"], {
  maxBuffer: 10_000_000,
}).toString("utf8");
const historicalScriptStartIndex = original.indexOf("'use strict';");
const adjustedHistoricalScript = applyVerifiedHistoricalDeltas(
  original.slice(
    historicalScriptStartIndex,
    original.indexOf("</script>", historicalScriptStartIndex),
  ),
  verifiedDeltas,
);
export type ReferenceGame = Pick<
  CompleteGameContext,
  | "state"
  | "ui"
  | "createInitialState"
  | "advanceSimulation"
  | "deriveSimulationRates"
  | "getUpgradeCost"
  | "getUpgradeStatus"
  | "getUpgradeLockReason"
  | "UPGRADE_DEFINITIONS"
  | "UPGRADE_BY_ID"
  | "EVENT_DEFINITIONS"
  | "ENDING_DEFINITIONS"
  | "DRAW_ENDING_BY_DIRECTIVE"
  | "REGION_DEFINITIONS"
  | "effects"
  | "purchaseUpgrade"
  | "buildDataCenter"
  | "checkDataCenterStrikes"
  | "rebuildDueDataCenters"
  | "endGame"
  | "createCapabilityAudit"
  | "queueCapabilityAudit"
  | "triggerRandomEvent"
  | "triggerEventById"
  | "scheduleEvent"
  | "consumeAuditHistoricalIncident"
  | "buildCapabilityAuditEvent"
  | "getGlobalAdoptionFraction"
  | "appendRunLog"
  | "publishBulletin"
  | "updateRegionRestrictions"
  | "checkSimulationMilestones"
  | "triggerMemeAdoptionBurst"
> &
  Pick<
    RuntimeContext,
    "startRunInRegion" | "previewEventChoice" | "showEvent" | "nextDecision"
  >;
export function createSeededRandom(randomState = 42): () => number {
  return () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
}
export function withControlledRandom<OperationResultType>(
  operation: () => OperationResultType,
  randomSource: number | (() => number) = 0.999999,
): OperationResultType {
  const originalRandom = Math.random;
  Math.random =
    typeof randomSource === "number" ? () => randomSource : randomSource;
  try {
    return operation();
  } finally {
    Math.random = originalRandom;
  }
}
export function createHistoricalReference(
  historicalDeltas: readonly VerifiedDelta[] = verifiedDeltas,
) {
  // Focused policy tests can select an explicit manifest or run the raw source.
  // Normal differential suites always use the complete verified manifest.
  const executableHistoricalScript =
    historicalDeltas === verifiedDeltas
      ? adjustedHistoricalScript
      : applyVerifiedHistoricalDeltas(
          original.slice(
            historicalScriptStartIndex,
            original.indexOf("</script>", historicalScriptStartIndex),
          ),
          historicalDeltas,
        );
  const historicalMath = Object.create(Math) as Math;
  historicalMath.random = createSeededRandom();
  const storageValues = new Map<string, string>();
  let observedHistoricalGame: ReferenceGame | undefined;
  // Minimal presentation ports let focused tests execute actual historical
  // boot/choice handlers. No rule/effect/log/news behavior lives in these ports.
  class ElementPort {
    hidden = false;
    textContent = "";
    className = "";
    disabled = false;
    children: ElementPort[] = [];
    onclick: (() => void) | null = null;
    classList = { toggle() {} };
    private innerHtmlMarkup = "";
    get innerHTML() {
      return this.innerHtmlMarkup;
    }
    set innerHTML(markupValue: string) {
      this.innerHtmlMarkup = markupValue;
      this.children = [];
    }
    appendChild(childElementPort: ElementPort) {
      this.children.push(childElementPort);
    }
    setAttribute() {}
    getContext() {
      return {};
    }
  }
  const elementPortsBySelector = new Map<string, ElementPort>();
  const getElementPort = (elementSelector: string): ElementPort => {
    let elementPort = elementPortsBySelector.get(elementSelector);
    if (!elementPort) {
      elementPort = new ElementPort();
      elementPortsBySelector.set(elementSelector, elementPort);
    }
    return elementPort;
  };
  const historicalSandbox = {
    // F18 independent measurement: use historical population/adoption data,
    // never the migrated reach/recordPeak implementation or a fixture setter.
    // Exact manifest call sites define the observations: adopt/burst before and
    // after, launch/start after seeding, and tick after the whole growth batch.
    observeAdoptionPeak() {
      assert.ok(
        observedHistoricalGame,
        "historical API exists before gameplay observations",
      );
      let totalPopulationMillions = 0,
        adoptedPopulationMillions = 0;
      for (const [
        regionIndex,
        regionDefinition,
      ] of observedHistoricalGame.REGION_DEFINITIONS.entries()) {
        totalPopulationMillions += regionDefinition.populationMillions;
        adoptedPopulationMillions +=
          observedHistoricalGame.state.regions[regionIndex].a *
          regionDefinition.populationMillions;
      }
      observedHistoricalGame.state.stats.peak = Math.max(
        observedHistoricalGame.state.stats.peak,
        adoptedPopulationMillions / totalPopulationMillions,
      );
    },
    Math: historicalMath,
    Date: class extends Date {
      static now() {
        return 1700000000000;
      }
    },
    performance: { now: () => 0 },
    matchMedia: () => ({ matches: true }),
    document: {
      querySelector: getElementPort,
      createElement: () => new ElementPort(),
    },
    innerWidth: 1024,
    navigator: {},
    localStorage: {
      getItem: (storageKey: string) => storageValues.get(storageKey) ?? null,
      setItem: (storageKey: string, storageValue: string) =>
        storageValues.set(storageKey, storageValue),
    },
    window: {},
    console,
  };
  virtualMachine.createContext(historicalSandbox);
  const browserStartupBoundaryIndex = executableHistoricalScript.indexOf(
    "addEventListener('resize',setAppHeight);",
  );
  assert.ok(
    browserStartupBoundaryIndex > 0,
    "historical browser startup boundary",
  );
  virtualMachine.runInContext(
    executableHistoricalScript.slice(0, browserStartupBoundaryIndex) +
      `
this.api={get state(){return S},set state(s){S=s},ui:UI,freshState,tick,derive,costOf,status,lockReason,UPGRADES,UP,EVENTS,ENDINGS,DRAWS,REGIONS,FX,buy,buildDC,checkStrikes,checkRebuilds,endGame,makeEval,fireEval,fireEvent,fireById,schedule,evalReal,buildEvalObj,reach,log,bulletin,checkRestrictions,checkMilestones,burst,startRun,previewChoice,showEvent,nextDecision};
toast=interrupt=pulseRegion=showEnd=openRegion=openTree=()=>{};SND.play=()=>{};
// The headless API retains action news; route only that presentation port using
// the actual historical bulletin, not transcribed log/news expectations.
{const originalBulletin=bulletin;bulletin=(...args)=>{const was=UI.acting;UI.acting=false;try{return originalBulletin(...args);}finally{UI.acting=was;}};}
`,
    historicalSandbox,
  );
  // Only the explicitly exported historical VM port is asserted. Rule bodies,
  // bulletin/log/news, scheduler, audits and outcomes execute the actual source.
  const historicalRulePort = (
    historicalSandbox as typeof historicalSandbox & {
      api: HistoricalReferencePort;
    }
  ).api;
  const historicalGame: ReferenceGame =
    adaptHistoricalReferencePort(historicalRulePort);
  observedHistoricalGame = historicalGame;
  return {
    game: historicalGame,
    historicalPort: historicalRulePort,
    choice(choiceIndex: number) {
      const choiceCallback =
        getElementPort("#evChoices").children[choiceIndex]?.onclick;
      assert.ok(
        choiceCallback,
        `historical choice ${choiceIndex} has a click handler`,
      );
      choiceCallback();
    },
    continueChoice() {
      const continueChoiceCallback = getElementPort("#evContinue").onclick;
      assert.ok(continueChoiceCallback, "historical Continue handler exists");
      continueChoiceCallback();
    },
    random(randomSource: number | (() => number)) {
      historicalMath.random =
        typeof randomSource === "number" ? () => randomSource : randomSource;
    },
  };
}
// State has no functions. structuredClone is not used on Vue proxies.
export function cloneSerializableValue<SerializableValueType>(
  serializedValue: SerializableValueType,
): SerializableValueType {
  return JSON.parse(JSON.stringify(serializedValue)) as SerializableValueType;
}
export function configureStartedRun<
  GameType extends Pick<ReferenceGame, "state" | "createInitialState">,
>(
  gameContext: GameType,
  architectureId: ArchitectureId = "assistant",
  difficultyId: DifficultyId = "standard",
): GameType {
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
  return gameContext;
}
export function snapshotComparableState(gameState: GameState) {
  const { savedAt: _wallClockSaveTimestamp, ...comparableState } =
    cloneSerializableValue(gameState);
  if (comparableState.ended) comparableState.ended.at = 1700000000000;
  return comparableState;
}
export function assertGameStatesEqual(
  actualState: GameState,
  historicalState: GameState,
  comparisonLabel: string,
): void {
  assert.deepEqual(
    snapshotComparableState(actualState),
    snapshotComparableState(historicalState),
    comparisonLabel,
  );
}
