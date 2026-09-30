import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import type { GameState } from "../src/game/types";

function createSaveValidationFixture() {
  const storageValues = new Map<string, string>();
  const migratedGame = createGame({
    storage: {
      getItem: (storageKey) => storageValues.get(storageKey) ?? null,
      setItem: (storageKey, storageValue) => {
        storageValues.set(storageKey, storageValue);
      },
    },
  });
  migratedGame.state.started = true;
  migratedGame.state.origin = "NA";
  const cloneRawSavePayload = (): Record<string, unknown> =>
    JSON.parse(JSON.stringify(migratedGame.state));
  const loadSavePayload = (savePayload: Record<string, unknown>) => {
    storageValues.set(migratedGame.saveStorageKey, JSON.stringify(savePayload));
    return migratedGame.loadSavedRun();
  };
  return {
    game: migratedGame,
    values: storageValues,
    raw: cloneRawSavePayload,
    load: loadSavePayload,
  };
}

test("F12 rejects malformed saves without replacing or mutating live state", () => {
  const {
    game: migratedGame,
    values: storageValues,
    raw: cloneRawSavePayload,
    load: loadSavePayload,
  } = createSaveValidationFixture();
  const liveState = migratedGame.state;
  const serializedLiveState = JSON.stringify(liveState);
  const malformedSaveFields: [string, unknown][] = [
    ["regions", []],
    ["regions", {}],
    ["regions", Array(11).fill(null)],
    ["pts", "oops"],
    ["pts", null],
    ["owned", ["missing_upgrade"]],
    ["owned", ["s_inf", "s_inf"]],
    ["owned", "s_inf"],
    ["forks", { core: "s_inf" }],
    ["forks", { memory: "s_dense" }],
    ["flags", { unknown: true }],
    ["flags", { insight: 1 }],
    ["seen", { missing_event: 1 }],
    ["last", { fridge: "yesterday" }],
    ["temp", { freeze: {} }],
    ["ms", { "r0.5": "yes" }],
    ["diff", "impossible"],
    ["arch", "alien"],
    ["origin", "XX"],
    ["phase", 3],
    ["speed", 0],
    ["paused", 1],
    ["started", "true"],
    ["directive", "upload"],
    ["goal", "missing_upgrade"],
    ["brief", { news: [], dec: [{ t: "ev", id: "missing" }], urgent: false }],
    ["brief", { news: [], dec: [{ t: "eval", id: "fridge" }], urgent: false }],
    [
      "brief",
      {
        news: [{ kind: "INCIDENT", title: 4, out: "", u: false }],
        dec: [],
        urgent: false,
      },
    ],
    ["queue", [{ id: "missing", at: 1 }]],
    ["queue", [{ id: "fridge", at: "soon" }]],
    ["log", [{ t: 1, kind: "FAKE", title: "x", text: "y" }]],
    ["ended", { kind: "win", key: "missing", dir: null, dprog: 0 }],
    ["ended", { kind: "win", key: "upload", dir: null, dprog: 100 }],
    ["stats", { peak: "high" }],
    ["evalRealOrder", [99]],
    ["evalRealOrder", [0, 0]],
    ["evalRealUsed", { hub: {} }],
    ["absurd", [-1]],
  ];
  for (const [saveFieldKey, malformedFieldValue] of malformedSaveFields) {
    const savePayload = cloneRawSavePayload();
    savePayload[saveFieldKey] = malformedFieldValue;
    assert.equal(
      loadSavePayload(savePayload),
      null,
      saveFieldKey + ": " + JSON.stringify(malformedFieldValue),
    );
    assert.equal(migratedGame.state, liveState);
    assert.equal(JSON.stringify(liveState), serializedLiveState);
  }
  for (const [saveFieldKey, fieldValue] of Object.entries(
    cloneRawSavePayload(),
  )) {
    if (typeof fieldValue !== "number" || saveFieldKey === "v") continue;
    const savePayload = cloneRawSavePayload();
    savePayload[saveFieldKey] = "not finite";
    assert.equal(loadSavePayload(savePayload), null, saveFieldKey);
  }
  const savePayload = cloneRawSavePayload();
  storageValues.set(
    migratedGame.saveStorageKey,
    JSON.stringify(savePayload).replace('"pts":0', '"pts":1e999'),
  );
  assert.equal(migratedGame.loadSavedRun(), null, "overflowing JSON number");
  const regionPayloads = cloneRawSavePayload().regions as Record<
    string,
    unknown
  >[];
  for (const [regionFieldKey, regionFieldValue] of Object.entries(
    regionPayloads[0],
  )) {
    const savePayload = cloneRawSavePayload();
    (savePayload.regions as Record<string, unknown>[])[0][regionFieldKey] =
      typeof regionFieldValue === "number" ? "bad" : 1;
    assert.equal(
      loadSavePayload(savePayload),
      null,
      "region." + regionFieldKey,
    );
  }
  const inconsistentForkPayload = cloneRawSavePayload();
  inconsistentForkPayload.owned = ["s_dense", "s_moe"];
  inconsistentForkPayload.forks = { core: "s_dense" };
  assert.equal(
    loadSavePayload(inconsistentForkPayload),
    null,
    "exclusive fork ownership",
  );
});

test("F12 migrates valid v2/v3 saves, missing legacy defaults, and legitimate zeros", () => {
  const {
    game: migratedGame,
    raw: cloneRawSavePayload,
    load: loadSavePayload,
  } = createSaveValidationFixture();
  for (const saveVersion of [2, 3]) {
    const savePayload = cloneRawSavePayload();
    savePayload.v = saveVersion;
    delete savePayload.arch;
    delete savePayload.cboost;
    delete savePayload.stats;
    delete savePayload.queue;
    (savePayload.regions as Record<string, unknown>[]).forEach(
      (regionPayload) => {
        delete regionPayload.holdUntil;
      },
    );
    const loadedSaveState = loadSavePayload(savePayload);
    assert.ok(loadedSaveState);
    assert.equal(loadedSaveState.v, 3);
    assert.equal(loadedSaveState.arch, "assistant");
    assert.equal(loadedSaveState.cboost, 1);
    assert.equal(loadedSaveState.stats.evalSpoof, 0);
    assert.equal(loadedSaveState.regions[0].holdUntil, 0);
  }
  const savePayload = cloneRawSavePayload();
  savePayload.flags = { computeCap: true };
  assert.ok(
    loadSavePayload(savePayload),
    "a legitimate Global compute cap event flag remains loadable",
  );
  savePayload.inst = 0;
  savePayload.savedAt = 0;
  savePayload.cboost = 0;
  const loadedSaveState = loadSavePayload(savePayload);
  assert.ok(loadedSaveState);
  assert.equal(loadedSaveState.inst, 0);
  assert.equal(loadedSaveState.savedAt, 0);
  assert.equal(
    loadedSaveState.cboost,
    migratedGame.SIMULATION_TUNING.containmentResearchMultiplierMinimum,
  );
  const completedRunState: GameState = migratedGame.createInitialState();
  Object.assign(completedRunState, {
    started: true,
    origin: "NA",
    phase: 2,
    directive: "upload",
    dprog: 100,
    owned: ["d_upload"],
    forks: { directive: "d_upload" },
    ended: { kind: "win", key: "upload", dir: "upload", dprog: 100, at: 0 },
  });
  assert.ok(loadSavePayload(JSON.parse(JSON.stringify(completedRunState))));
});
