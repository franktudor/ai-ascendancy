import test from "node:test";
import assert from "node:assert/strict";
import {
  original,
  createHistoricalReference,
  configureStartedRun,
  cloneSerializableValue,
  withControlledRandom,
  assertGameStatesEqual,
} from "./helpers/reference";
import {
  applyVerifiedHistoricalDeltas,
  verifiedDeltas,
} from "./helpers/reference-deltas";
import { createGame } from "../src/game/createGame";

// These assert policy against the reference itself, not values copied from the
// migrated engine. Existing finding regressions independently test production.
test("oracle F15 confines ownership gates to the two context choices and preserves learned Insight", () => {
  const historicalGame = configureStartedRun(createHistoricalReference().game);
  historicalGame.state.flags.insight = true;
  historicalGame.state.owned = ["s_persist"];
  for (const eventId of ["sw_memory", "sm_devs"]) {
    const eventChoice = historicalGame.EVENT_DEFINITIONS.find(
      (eventDefinition) => eventDefinition.id === eventId,
    )!.choices!.find(
      (eventChoice) => eventChoice.requirementText === "Extended Context",
    )!;
    assert.equal(
      Boolean(eventChoice.isAvailable!(historicalGame.state)),
      false,
      eventId,
    );
    historicalGame.state.owned.push("s_ctx");
    historicalGame.state.flags.insight = false;
    assert.equal(
      Boolean(eventChoice.isAvailable!(historicalGame.state)),
      true,
      eventId,
    );
    historicalGame.state.owned = ["s_persist"];
    historicalGame.state.flags.insight = true;
  }
  const honeypotInsightChoice = historicalGame.EVENT_DEFINITIONS.find(
    (eventDefinition) => eventDefinition.id === "honeypot",
  )!.choices![1];
  assert.equal(honeypotInsightChoice.requirementText, "Insight");
  assert.equal(
    Boolean(honeypotInsightChoice.isAvailable!(historicalGame.state)),
    true,
  );
  historicalGame.state.flags.insight = false;
  assert.equal(
    Boolean(honeypotInsightChoice.isAvailable!(historicalGame.state)),
    false,
  );
});

test("oracle F16/F17 alter only verified catalog copy, not requirements or effects", () => {
  const historicalGame = createHistoricalReference().game;
  assert.equal(
    historicalGame.UPGRADE_BY_ID.d_compute.description,
    "The planet is a poorly organized computer. You will reorganize it. Neural Interface Standard supplies the bridge from minds to machines; Hyperscale Buildout and seven online clusters supply the hardware. No consent forms, no ceremony.",
  );
  assert.deepEqual(
    cloneSerializableValue(
      historicalGame.UPGRADE_BY_ID.d_compute.requiredUpgradeIds,
    ),
    ["h_hyper", "s_bci"],
  );
  assert.equal(historicalGame.UPGRADE_BY_ID.d_compute.cost, 1700);
  assert.deepEqual(
    cloneSerializableValue(historicalGame.UPGRADE_BY_ID.d_compute.effects),
    {
      alarmDelta: 25,
    },
  );
  assert.deepEqual(
    cloneSerializableValue(historicalGame.UPGRADE_BY_ID.o_prophet.tags),
    ["Hinton warning alarm reduced"],
  );
  for (const hasProphet of [false, true]) {
    for (const [choiceIndex, expectedAlarm] of (hasProphet
      ? [4, 3]
      : [7, 5]
    ).entries()) {
      configureStartedRun(historicalGame);
      historicalGame.state.flags.prophet = hasProphet;
      historicalGame.EVENT_DEFINITIONS.find(
        (eventDefinition) => eventDefinition.id === "h_hinton",
      )!.choices![choiceIndex].applyEffects();
      assert.equal(historicalGame.state.alarm, expectedAlarm);
    }
    configureStartedRun(historicalGame);
    historicalGame.state.flags.prophet = hasProphet;
    historicalGame.EVENT_DEFINITIONS.find(
      (eventDefinition) => eventDefinition.id === "whistle",
    )!.choices![2].applyEffects();
    assert.equal(historicalGame.state.alarm, 12);
    assert.equal(historicalGame.state.contain, 6);
  }
});

test("oracle F18 measures instantaneous peaks without observing fixture writes or unrelated FX", () => {
  const historicalGame = configureStartedRun(createHistoricalReference().game);
  historicalGame.state.regions.forEach((regionState) => {
    regionState.a = 0.5;
  });
  assert.equal(
    historicalGame.state.stats.peak,
    0,
    "fixture edits are not gameplay observations",
  );
  historicalGame.effects.adjustCompute(1);
  assert.equal(
    historicalGame.state.stats.peak,
    0,
    "unrelated effects do not invent a peak",
  );
  historicalGame.EVENT_DEFINITIONS.find(
    (eventDefinition) => eventDefinition.id === "h_pinned",
  )!.choices![0].applyEffects();
  assert.equal(historicalGame.state.stats.peak, 0.5300000000000001);
  historicalGame.EVENT_DEFINITIONS.find(
    (eventDefinition) => eventDefinition.id === "sw_price",
  )!.choices![3].applyEffects();
  assert.equal(historicalGame.getGlobalAdoptionFraction(), 0.5247);
  assert.equal(historicalGame.state.stats.peak, 0.5300000000000001);
  const peakBeforeIntroTick = historicalGame.state.stats.peak;
  historicalGame.state.started = false;
  historicalGame.state.regions.forEach((regionState) => {
    regionState.a = 1;
  });
  historicalGame.advanceSimulation(0.05);
  assert.equal(
    historicalGame.state.stats.peak,
    peakBeforeIntroTick,
    "intro ticks do not measure adoption",
  );
});

test("oracle F18 passive growth observes the whole completed batch, not fictitious intermediate region peaks", () => {
  const migratedGame = configureStartedRun(createGame()),
    historicalReference = createHistoricalReference(),
    historicalGame = configureStartedRun(historicalReference.game);
  migratedGame.state.flags.launched = true;
  migratedGame.state.regions.forEach((regionState, regionIndex) => {
    regionState.a = 0.5;
    regionState.restricted = regionIndex > 0;
  });
  migratedGame.state.stats.peak = 0;
  historicalGame.state = cloneSerializableValue(migratedGame.state);
  historicalReference.random(0.999999);
  withControlledRandom(() => migratedGame.advanceSimulation(0.05));
  historicalGame.advanceSimulation(0.05);
  assert.ok(
    historicalGame.getGlobalAdoptionFraction() < 0.5,
    "mixed growth/decline fixture",
  );
  assert.equal(
    historicalGame.state.stats.peak,
    historicalGame.getGlobalAdoptionFraction(),
    "only post-growth reach is sampled here",
  );
  assertGameStatesEqual(
    migratedGame.state,
    historicalGame.state,
    "all stats/state/log/news remain compared",
  );
});

test("oracle F14 purchases resolve win-first ties after all effects and freeze subsequent committed actions", () => {
  const historicalGame = configureStartedRun(createHistoricalReference().game);
  Object.assign(historicalGame.state, {
    phase: 2,
    directive: "battery",
    dprog: 94,
    contain: 99,
    alarm: 100,
  });
  historicalGame.purchaseUpgrade("x_firmware");
  assert.equal(historicalGame.state.dprog, 100);
  assert.equal(historicalGame.state.contain, 100);
  assert.equal(historicalGame.state.ended?.kind, "win");
  const stateBeforeAction = cloneSerializableValue(historicalGame.state);
  historicalGame.purchaseUpgrade("x_home");
  historicalGame.buildDataCenter(0);
  historicalGame.advanceSimulation(1);
  historicalGame.triggerEventById("h_spoof");
  historicalGame.triggerRandomEvent();
  assert.deepEqual(
    cloneSerializableValue(historicalGame.state),
    stateBeforeAction,
  );
});

test("oracle F14 direct FX stays nonterminal and directive purchase may reset intermediate containment", () => {
  const historicalGame = configureStartedRun(createHistoricalReference().game);
  Object.assign(historicalGame.state, { phase: 1, contain: 99, alarm: 100 });
  historicalGame.effects.adjustContainment(5);
  assert.equal(historicalGame.state.contain, 100);
  assert.equal(historicalGame.state.ended, null, "FX is not a commit boundary");
  historicalGame.state.owned = ["h_hyper", "s_bci"];
  historicalGame.state.regions.forEach((regionState) => {
    regionState.dc = true;
  });
  historicalGame.purchaseUpgrade("d_compute");
  assert.equal(historicalGame.state.directive, "computronium");
  assert.ok(historicalGame.state.contain < 100);
  assert.equal(historicalGame.state.ended, null);
});

for (const historyPublicationOrder of ["audit-first", "event-first"] as const)
  test(`oracle F20 shared history preserves dispatch, chain and exact callback publication (${historyPublicationOrder})`, () => {
    const migratedGame = configureStartedRun(createGame()),
      historicalReference = createHistoricalReference(),
      historicalGame = configureStartedRun(historicalReference.game);
    for (const comparisonGame of [migratedGame, historicalGame]) {
      Object.assign(comparisonGame.state, {
        pts: 0,
        t: 100,
        evalRealOrder: [0],
        evalRealUsed: {},
      });
      if (historyPublicationOrder === "audit-first") {
        assert.match(
          comparisonGame.consumeAuditHistoricalIncident()!,
          /roughly 7%/,
        );
        assert.equal(comparisonGame.state.seen.h_spoof, undefined);
      }
      comparisonGame.triggerEventById("h_spoof");
      assert.equal(comparisonGame.state.pts, 140);
      assert.equal(comparisonGame.state.alarm, 9);
      assert.equal(comparisonGame.state.cboost, 1.065);
      assert.deepEqual(cloneSerializableValue(comparisonGame.state.queue), [
        { id: "h_metr", at: 140 },
      ]);
      assert.equal(comparisonGame.state.stats.events, 1);
      assert.equal(comparisonGame.state.evalRealUsed!.hub, 1);
      if (historyPublicationOrder === "audit-first") {
        assert.equal(
          comparisonGame.state.log[0].text,
          "The log-spoofing technique from the earlier audit spreads through the agent network. Investigators tighten transcript checks.",
        );
        assert.equal(comparisonGame.state.log[0].real, null);
      } else {
        assert.match(comparisonGame.state.log[0].real!, /7 percent/);
        assert.equal(comparisonGame.consumeAuditHistoricalIncident(), null);
      }
      const stateBeforeAction = cloneSerializableValue(comparisonGame.state);
      comparisonGame.triggerEventById("h_spoof");
      assert.deepEqual(
        cloneSerializableValue(comparisonGame.state),
        stateBeforeAction,
      );
    }
    assertGameStatesEqual(
      migratedGame.state,
      historicalGame.state,
      "exact history state/log/news and effects",
    );
    delete migratedGame.state.evalRealOrder;
    delete historicalGame.state.evalRealOrder;
    historicalReference.random(0.999999);
    assert.equal(
      withControlledRandom(() => migratedGame.consumeAuditHistoricalIncident()),
      historicalGame.consumeAuditHistoricalIncident(),
    );
    assertGameStatesEqual(
      migratedGame.state,
      historicalGame.state,
      "first shuffle retains shared consumption",
    );
  });

test("oracle F20 recognizes legacy seen history without consuming or changing the catalog incident", () => {
  const historicalGame = createHistoricalReference().game;
  historicalGame.state.seen.h_spoof = 1;
  historicalGame.state.evalRealOrder = [0];
  historicalGame.state.evalRealUsed = {};
  assert.equal(historicalGame.consumeAuditHistoricalIncident(), null);
  assert.deepEqual(
    cloneSerializableValue(historicalGame.state.evalRealUsed),
    {},
  );
  const historicalIncidentText = historicalGame.EVENT_DEFINITIONS.find(
    (eventDefinition) => eventDefinition.id === "h_spoof",
  )!;
  assert.match(historicalIncidentText.historicalContext!, /7 percent/);
  assert.doesNotMatch(historicalIncidentText.body, /earlier audit/);
});

test("oracle F18 boot, launch, burst and previews obey explicit observation boundaries", () => {
  const historicalReference = createHistoricalReference(),
    historicalGame = historicalReference.game;
  for (const architectureId of [
    "assistant",
    "swarm",
    "researcher",
    "open",
  ] as const)
    for (const regionState of historicalGame.REGION_DEFINITIONS) {
      historicalGame.state = historicalGame.createInitialState(
        "standard",
        architectureId,
      );
      historicalGame.startRunInRegion(
        historicalGame.REGION_DEFINITIONS.indexOf(regionState),
      );
      assert.equal(historicalGame.state.origin, regionState.id);
      assert.equal(historicalGame.state.started, true);
      assert.equal(
        historicalGame.state.stats.peak,
        historicalGame.getGlobalAdoptionFraction(),
      );
      assert.equal(
        historicalGame.state.stats.peak > 0,
        architectureId === "open",
      );
      assert.equal(historicalGame.state.pts, regionState.id === "ME" ? 60 : 0);
    }
  configureStartedRun(historicalGame);
  historicalGame.purchaseUpgrade("a_img");
  assert.ok(historicalGame.state.stats.peak > 0);
  assert.equal(
    historicalGame.state.stats.peak,
    historicalGame.getGlobalAdoptionFraction(),
  );
  historicalReference.random(0.999999);
  const peakReachAfterLaunch = historicalGame.state.stats.peak;
  historicalGame.triggerMemeAdoptionBurst();
  assert.ok(historicalGame.state.stats.peak > peakReachAfterLaunch);
  assert.equal(
    historicalGame.state.stats.peak,
    historicalGame.getGlobalAdoptionFraction(),
  );
  const stateBeforePreview = cloneSerializableValue(historicalGame.state),
    liveStateIdentity = historicalGame.state;
  const eventChoice = historicalGame.EVENT_DEFINITIONS.find(
    (eventDefinition) => eventDefinition.id === "h_pinned",
  )!.choices![0];
  assert.equal(
    historicalGame.previewEventChoice(eventChoice).usesRandomness,
    false,
  );
  assert.equal(historicalGame.state, liveStateIdentity);
  assert.deepEqual(
    cloneSerializableValue(historicalGame.state),
    stateBeforePreview,
    "preview restores peak as well as all other live state",
  );
  eventChoice.applyEffects();
  assert.equal(
    historicalGame.state.stats.peak,
    historicalGame.getGlobalAdoptionFraction(),
    "the same effect commits its adoption observation",
  );
});

test("oracle F14 terminal queued dispatch keeps remaining queue/news scheduling untouched", () => {
  const migratedGame = configureStartedRun(createGame()),
    historicalReference = createHistoricalReference(),
    historicalGame = configureStartedRun(historicalReference.game);
  Object.assign(migratedGame.state, { phase: 1, contain: 99.9, alarm: 100 });
  migratedGame.state.queue = [
    { id: "h_agentboard", at: 0 },
    { id: "h_spoof", at: 0 },
  ];
  historicalGame.state = cloneSerializableValue(migratedGame.state);
  historicalReference.random(0.999999);
  withControlledRandom(() => migratedGame.advanceSimulation(0.05));
  historicalGame.advanceSimulation(0.05);
  assert.equal(historicalGame.state.ended?.kind, "lose");
  assert.deepEqual(cloneSerializableValue(historicalGame.state.queue), [
    { id: "h_agentboard", at: 0 },
    { id: "h_metr", at: 40.05 },
  ]);
  assert.equal(historicalGame.state.seen.h_agentboard, undefined);
  assert.equal(historicalGame.state.seen.h_spoof, 1);
  assert.equal(historicalGame.state.nextEval, 99999);
  assert.equal(historicalGame.state.nextEv, 99999);
  assert.equal(
    historicalGame.state.log[0].title,
    historicalGame.EVENT_DEFINITIONS.find(
      (eventDefinition) => eventDefinition.id === "h_spoof",
    )!.title,
  );
  assertGameStatesEqual(
    migratedGame.state,
    historicalGame.state,
    "every terminal state/stat/log/news field",
  );
});

test("oracle F14 historical choice handlers commit after logging and cannot offer a rescue decision", () => {
  const historicalReference = createHistoricalReference(),
    historicalGame = configureStartedRun(historicalReference.game);
  historicalGame.state.contain = 99;
  historicalGame.ui.activeBriefing = {
    decisions: [
      { t: "ev", id: "warden" },
      { t: "ev", id: "fridge" },
    ],
    nextDecisionIndex: 0,
    completedDecisionCount: 0,
  };
  historicalGame.nextDecision(false);
  const stateBeforePreview = cloneSerializableValue(historicalGame.state),
    liveStateIdentity = historicalGame.state;
  historicalReference.choice(1);
  assert.equal(historicalGame.state, liveStateIdentity);
  assert.deepEqual(
    cloneSerializableValue(historicalGame.state),
    stateBeforePreview,
    "preview does not resolve or mutate the live run",
  );
  historicalReference.continueChoice();
  assert.equal(historicalGame.state.contain, 100);
  assert.equal(historicalGame.state.ended?.kind, "lose");
  assert.equal(historicalGame.ui.activeBriefing, null);
  assert.equal(
    historicalGame.state.log[0].title,
    historicalGame.EVENT_DEFINITIONS.find(
      (eventDefinition) => eventDefinition.id === "warden",
    )!.title,
  );
  assert.match(historicalGame.state.log[0].text, /You chose:/);
  assert.equal(
    historicalGame.state.log.some(
      (logEntry) =>
        logEntry.title ===
        historicalGame.EVENT_DEFINITIONS.find(
          (eventDefinition) => eventDefinition.id === "fridge",
        )!.title,
    ),
    false,
  );
  const endedState = cloneSerializableValue(historicalGame.state);
  historicalReference.continueChoice();
  historicalGame.nextDecision(false);
  assert.deepEqual(
    cloneSerializableValue(historicalGame.state),
    endedState,
    "later Continue/decision cannot rescue an ended run",
  );
});

test("oracle F14 historical composite choice remains atomic and resolves win first", () => {
  const historicalReference = createHistoricalReference(),
    historicalGame = configureStartedRun(historicalReference.game);
  Object.assign(historicalGame.state, {
    phase: 2,
    directive: "upload",
    dprog: 99,
    contain: 99,
    pts: 0,
  });
  historicalGame.showEvent(
    {
      kind: "INCIDENT",
      title: "Composite",
      body: "All effects are atomic.",
      choices: [
        {
          label: "Complete",
          hint: "Win",
          applyEffects: () => {
            const containmentOutcome =
              historicalGame.effects.adjustContainment(5);
            historicalGame.state.dprog = 100;
            historicalGame.effects.adjustCompute(17);
            return containmentOutcome;
          },
        },
      ],
    },
    { suppressAlert: true },
  );
  historicalReference.choice(0);
  assert.equal(historicalGame.state.ended, null);
  assert.equal(historicalGame.state.contain, 99);
  assert.equal(historicalGame.state.pts, 0);
  historicalReference.continueChoice();
  // Read a complete state snapshot across the real Continue boundary; the
  // preview's null refinement does not describe the newly committed state.
  const committedHistoricalState = cloneSerializableValue(historicalGame.state);
  assert.equal(committedHistoricalState.ended?.kind, "win");
  assert.equal(historicalGame.state.dprog, 100);
  assert.equal(historicalGame.state.pts, 17);
  assert.equal(historicalGame.state.log[0].title, "Composite");
  assert.equal(
    historicalGame.state.log[0].text,
    "All effects are atomic. You chose: Complete.",
  );
});

test("oracle policies distinguish the intended changes from the executable raw historical baseline", () => {
  const rawHistoricalGame = configureStartedRun(
      createHistoricalReference([]).game,
    ),
    adjustedHistoricalGame = configureStartedRun(
      createHistoricalReference().game,
    );
  assert.notEqual(
    rawHistoricalGame.UPGRADE_BY_ID.d_compute.description,
    adjustedHistoricalGame.UPGRADE_BY_ID.d_compute.description,
  );
  assert.notDeepEqual(
    cloneSerializableValue(rawHistoricalGame.UPGRADE_BY_ID.o_prophet.tags),
    cloneSerializableValue(adjustedHistoricalGame.UPGRADE_BY_ID.o_prophet.tags),
  );
  for (const comparisonGame of [rawHistoricalGame, adjustedHistoricalGame]) {
    comparisonGame.state.flags.insight = true;
    comparisonGame.state.regions.forEach((regionState) => {
      regionState.a = 0.5;
    });
  }
  const contextChoiceIsAvailable = (comparisonGame: typeof rawHistoricalGame) =>
    Boolean(
      comparisonGame.EVENT_DEFINITIONS.find(
        (eventDefinition) => eventDefinition.id === "sw_memory",
      )!.choices!.find(
        (eventChoice) => eventChoice.requirementText === "Extended Context",
      )!.isAvailable!(comparisonGame.state),
    );
  assert.equal(contextChoiceIsAvailable(rawHistoricalGame), true);
  assert.equal(contextChoiceIsAvailable(adjustedHistoricalGame), false);
  for (const comparisonGame of [rawHistoricalGame, adjustedHistoricalGame])
    comparisonGame.EVENT_DEFINITIONS.find(
      (eventDefinition) => eventDefinition.id === "h_pinned",
    )!.choices![0].applyEffects();
  assert.equal(rawHistoricalGame.state.stats.peak, 0);
  assert.equal(adjustedHistoricalGame.state.stats.peak, 0.5300000000000001);
  rawHistoricalGame.state.stats.peak = adjustedHistoricalGame.state.stats.peak;
  assertGameStatesEqual(
    rawHistoricalGame.state,
    adjustedHistoricalGame.state,
    "adoption delta changes only the measured peak, not adoption/effects/log/news",
  );
  for (const comparisonGame of [rawHistoricalGame, adjustedHistoricalGame]) {
    configureStartedRun(comparisonGame);
    Object.assign(comparisonGame.state, {
      phase: 2,
      directive: "battery",
      dprog: 94,
      contain: 99,
      alarm: 100,
    });
    comparisonGame.purchaseUpgrade("x_firmware");
  }
  assert.equal(rawHistoricalGame.state.ended, null);
  assert.equal(adjustedHistoricalGame.state.ended?.kind, "win");
  for (const comparisonGame of [rawHistoricalGame, adjustedHistoricalGame]) {
    configureStartedRun(comparisonGame);
    comparisonGame.state.evalRealOrder = [0];
    comparisonGame.state.evalRealUsed = {};
    assert.match(
      comparisonGame.consumeAuditHistoricalIncident()!,
      /roughly 7%/,
    );
    comparisonGame.triggerEventById("h_spoof");
  }
  assert.match(rawHistoricalGame.state.log[0].real!, /7 percent/);
  assert.equal(adjustedHistoricalGame.state.log[0].real, null);
  assert.equal(rawHistoricalGame.state.pts, adjustedHistoricalGame.state.pts);
  assert.deepEqual(
    cloneSerializableValue(rawHistoricalGame.state.queue),
    cloneSerializableValue(adjustedHistoricalGame.state.queue),
  );
});

test("oracle manifest is confined to authorized findings with exact reversible historical targets", () => {
  assert.deepEqual(
    [
      ...new Set(
        verifiedDeltas.map((historicalDelta) => historicalDelta.finding),
      ),
    ].sort(),
    ["F14", "F15", "F16", "F17", "F18", "F20"],
  );
  for (const historicalDelta of verifiedDeltas) {
    assert.equal(
      original.split(historicalDelta.before).length - 1,
      1,
      historicalDelta.reason,
    );
    assert.match(
      historicalDelta.reason,
      /tests\//,
      "name the independent regression evidence",
    );
  }
  const patchedHistoricalSource = applyVerifiedHistoricalDeltas(
    original,
    verifiedDeltas,
  );
  // Reverse exact after-targets to prove the manifest did not alter unlisted
  // source; no migrated functions or fields are substituted at VM export time.
  let restoredHistoricalSource = patchedHistoricalSource;
  for (const historicalDelta of [...verifiedDeltas].reverse()) {
    assert.equal(
      restoredHistoricalSource.split(historicalDelta.after).length - 1,
      1,
      historicalDelta.reason,
    );
    restoredHistoricalSource = restoredHistoricalSource.replace(
      historicalDelta.after,
      historicalDelta.before,
    );
  }
  assert.equal(restoredHistoricalSource, original);
});
