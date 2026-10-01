import test from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import virtualMachine from "node:vm";
import { isReactive, watch } from "vue";
import { createGame } from "../src/game/createGame";
import { installEventController } from "../src/game/eventController";
import { adaptHistoricalPreviewPort } from "./helpers/historical-naming";
import type { HistoricalPreviewPort } from "./helpers/historical-naming";
import type { EventChoice, RuntimeContext } from "../src/game/types";

function createPreviewTestGame() {
  // Only previewChoice is invoked headlessly; no uninstalled DOM port is used.
  const migratedGame = createGame() as RuntimeContext;
  installEventController(migratedGame);
  return migratedGame;
}

function createHistoricalPreviewReference() {
  const historicalHtml = childProcess
    .execFileSync("git", ["show", "72c1ba9:index.html"], {
      maxBuffer: 10_000_000,
    })
    .toString("utf8");
  const historicalScriptStartIndex = historicalHtml.indexOf("'use strict';");
  const historicalScript = historicalHtml.slice(
    historicalScriptStartIndex,
    historicalHtml.indexOf("</script>", historicalScriptStartIndex),
  );
  const historicalSandbox = {
    Math: Object.create(Math) as Math,
    Date,
    performance: { now: () => 0 },
    matchMedia: () => ({ matches: true }),
    document: { querySelector: () => ({ getContext: () => ({}) }) },
    localStorage: { getItem: () => null, setItem: () => {} },
    window: {},
    console,
  };
  virtualMachine.createContext(historicalSandbox);
  virtualMachine.runInContext(
    historicalScript.slice(
      0,
      historicalScript.indexOf("addEventListener('resize',setAppHeight);"),
    ) +
      "\nthis.api={get state(){return S},set state(s){S=s},EVENTS,previewChoice};",
    historicalSandbox,
  );
  // The historical VM exports this explicit port; its implementation stays unchanged.
  const historicalPreviewPort = (
    historicalSandbox as typeof historicalSandbox & {
      api: HistoricalPreviewPort;
    }
  ).api;
  return adaptHistoricalPreviewPort(historicalPreviewPort);
}

function populatePreviewFixture(
  migratedGame: Pick<RuntimeContext, "state" | "EVENT_DEFINITIONS">,
) {
  Object.assign(migratedGame.state, {
    started: true,
    origin: "NA",
    pts: 100000,
    phase: 2,
    directive: "upload",
    dprog: 40,
    alarm: 60,
    contain: 40,
    inst: 1000,
    sig: 70,
    pace: 70,
  });
  migratedGame.state.regions.forEach((regionState) =>
    Object.assign(regionState, { a: 0.5, dc: true }),
  );
  migratedGame.state.log = Array.from(
    { length: 1000 },
    (_unusedEntry, logEntryIndex) => {
      const eventDefinition =
        migratedGame.EVENT_DEFINITIONS[
          logEntryIndex % migratedGame.EVENT_DEFINITIONS.length
        ];
      return {
        t: logEntryIndex,
        kind: eventDefinition.kind,
        title: eventDefinition.title,
        text: eventDefinition.body,
        real: eventDefinition.historicalContext,
      };
    },
  );
}

test("gamble samples are nonreactive and never replace the published state", () => {
  const migratedGame = createPreviewTestGame();
  populatePreviewFixture(migratedGame);
  const liveState = migratedGame.state,
    liveUi = migratedGame.ui;
  const serializedStateBeforePreview = JSON.stringify(liveState);
  let statePublicationCount = 0,
    previewSampleCount = 0,
    snapshotCount = 0;
  let sampleWasReactive = false;
  const stopStateWatcher = watch(
    () => migratedGame.state,
    () => statePublicationCount++,
    { flush: "sync" },
  );
  const stringifyOriginalValue = JSON.stringify;
  JSON.stringify = new Proxy(stringifyOriginalValue, {
    apply(
      stringifyTarget,
      stringifyReceiver: unknown,
      stringifyArguments: unknown[],
    ) {
      snapshotCount++;
      return Reflect.apply(
        stringifyTarget,
        stringifyReceiver,
        stringifyArguments,
      ) as string;
    },
  });
  try {
    const gamblePreview = migratedGame.previewEventChoice({
      label: "Gamble",
      hint: "",
      applyEffects: () => {
        previewSampleCount++;
        sampleWasReactive ||=
          isReactive(migratedGame.state) ||
          isReactive(migratedGame.ui) ||
          isReactive(migratedGame.state.regions[0]);
        migratedGame.ui.screenMode = "origin";
        return migratedGame.effects.adjustCompute(Math.random() < 0.5 ? 1 : -1);
      },
    });
    assert.equal(gamblePreview.usesRandomness, true);
    assert.equal(
      sampleWasReactive,
      false,
      "sample state and UI must not be reactive",
    );
    assert.equal(previewSampleCount, 200);
    assert.equal(
      snapshotCount,
      1,
      "snapshot raw rules state once, not per sample",
    );
    assert.equal(
      statePublicationCount,
      0,
      "Vue must never observe preview states",
    );
  } finally {
    JSON.stringify = stringifyOriginalValue;
    stopStateWatcher();
  }
  assert.equal(migratedGame.state, liveState);
  assert.equal(migratedGame.ui, liveUi);
  assert.equal(migratedGame.ui.screenMode, "intro");
  assert.equal(JSON.stringify(liveState), serializedStateBeforePreview);
});

test("throwing preview effects restore RNG, all UI and effect ports", () => {
  const migratedGame = createPreviewTestGame(),
    liveState = migratedGame.state,
    liveUi = migratedGame.ui;
  const serializedStateBeforePreview = JSON.stringify({
    state: liveState,
    ui: liveUi,
  });
  const originalEffectPorts = {
    toast: migratedGame.showToast,
    bulletin: migratedGame.publishBulletin,
    log: migratedGame.appendRunLog,
    pushTicker: migratedGame.enqueueTickerHeadline,
    pulseRegion: migratedGame.pulseRegion,
    save: migratedGame.saveRun,
    randIds: migratedGame.pickRandomRegionIds,
    play: migratedGame.soundController.playCue,
    random: Math.random,
  };
  migratedGame.previewEventChoice({
    label: "Throw",
    hint: "",
    applyEffects: () => {
      migratedGame.state.pts = -10;
      migratedGame.ui.screenMode = "origin";
      migratedGame.ui.dirty = false;
      migratedGame.ui.tickerQueue.push("must not leak");
      Math.random();
      migratedGame.showToast("SYSTEM", "ignored");
      migratedGame.saveRun();
      throw new Error("expected preview failure");
    },
  });
  assert.equal(migratedGame.state, liveState);
  assert.equal(migratedGame.ui, liveUi);
  assert.equal(
    JSON.stringify({ state: liveState, ui: liveUi }),
    serializedStateBeforePreview,
  );
  assert.deepEqual(
    {
      toast: migratedGame.showToast,
      bulletin: migratedGame.publishBulletin,
      log: migratedGame.appendRunLog,
      pushTicker: migratedGame.enqueueTickerHeadline,
      pulseRegion: migratedGame.pulseRegion,
      save: migratedGame.saveRun,
      randIds: migratedGame.pickRandomRegionIds,
      play: migratedGame.soundController.playCue,
      random: Math.random,
    },
    originalEffectPorts,
  );
});

test("all 160 original choice previews retain outcomes and isolation", () => {
  const migratedGame = createPreviewTestGame(),
    historicalGame = createHistoricalPreviewReference();
  populatePreviewFixture(migratedGame);
  historicalGame.state = JSON.parse(
    JSON.stringify(migratedGame.state),
  ) as RuntimeContext["state"];
  const liveState = migratedGame.state,
    liveUi = migratedGame.ui;
  const serializedStateBeforePreview = JSON.stringify({
    state: liveState,
    ui: liveUi,
  });
  let comparedChoiceCount = 0;
  for (const [
    eventIndex,
    eventDefinition,
  ] of migratedGame.EVENT_DEFINITIONS.entries()) {
    for (const [choiceIndex, eventChoice] of (
      eventDefinition.choices ?? []
    ).entries()) {
      const historicalChoice: EventChoice =
        historicalGame.EVENT_DEFINITIONS[eventIndex].choices![choiceIndex];
      const historicalPreview =
        historicalGame.previewEventChoice(historicalChoice);
      const actualPreview = migratedGame.previewEventChoice(eventChoice);
      assert.deepEqual(
        actualPreview,
        JSON.parse(JSON.stringify(historicalPreview)),
        `${eventDefinition.id}/${choiceIndex}`,
      );
      assert.equal(migratedGame.state, liveState);
      assert.equal(migratedGame.ui, liveUi);
      assert.equal(
        JSON.stringify({ state: liveState, ui: liveUi }),
        serializedStateBeforePreview,
        `${eventDefinition.id}/${choiceIndex} isolation`,
      );
      comparedChoiceCount++;
    }
  }
  assert.equal(comparedChoiceCount, 160);
});
