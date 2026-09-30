import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import type { GameState } from "../src/game/types";

function fixture() {
  const values = new Map<string, string>();
  const game = createGame({
    storage: {
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => {
        values.set(k, v);
      },
    },
  });
  game.state.started = true;
  game.state.origin = "NA";
  const raw = (): Record<string, unknown> =>
    JSON.parse(JSON.stringify(game.state));
  const load = (save: Record<string, unknown>) => {
    values.set(game.KEY, JSON.stringify(save));
    return game.load();
  };
  return { game, values, raw, load };
}

test("F12 rejects malformed saves without replacing or mutating live state", () => {
  const { game, values, raw, load } = fixture();
  const live = game.state;
  const before = JSON.stringify(live);
  const corruptions: [string, unknown][] = [
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
  for (const [key, value] of corruptions) {
    const s = raw();
    s[key] = value;
    assert.equal(load(s), null, key + ": " + JSON.stringify(value));
    assert.equal(game.state, live);
    assert.equal(JSON.stringify(live), before);
  }
  for (const [key, value] of Object.entries(raw())) {
    if (typeof value !== "number" || key === "v") continue;
    const s = raw();
    s[key] = "not finite";
    assert.equal(load(s), null, key);
  }
  const s = raw();
  values.set(game.KEY, JSON.stringify(s).replace('"pts":0', '"pts":1e999'));
  assert.equal(game.load(), null, "overflowing JSON number");
  const regions = raw().regions as Record<string, unknown>[];
  for (const [key, value] of Object.entries(regions[0])) {
    const s = raw();
    (s.regions as Record<string, unknown>[])[0][key] =
      typeof value === "number" ? "bad" : 1;
    assert.equal(load(s), null, "region." + key);
  }
  const inconsistent = raw();
  inconsistent.owned = ["s_dense", "s_moe"];
  inconsistent.forks = { core: "s_dense" };
  assert.equal(load(inconsistent), null, "exclusive fork ownership");
});

test("F12 migrates valid v2/v3 saves, missing legacy defaults, and legitimate zeros", () => {
  const { game, raw, load } = fixture();
  for (const v of [2, 3]) {
    const s = raw();
    s.v = v;
    delete s.arch;
    delete s.cboost;
    delete s.stats;
    delete s.queue;
    (s.regions as Record<string, unknown>[]).forEach((r) => {
      delete r.holdUntil;
    });
    const loaded = load(s);
    assert.ok(loaded);
    assert.equal(loaded.v, 3);
    assert.equal(loaded.arch, "assistant");
    assert.equal(loaded.cboost, 1);
    assert.equal(loaded.stats.evalSpoof, 0);
    assert.equal(loaded.regions[0].holdUntil, 0);
  }
  const s = raw();
  s.flags = { computeCap: true };
  assert.ok(
    load(s),
    "a legitimate Global compute cap event flag remains loadable",
  );
  s.inst = 0;
  s.savedAt = 0;
  s.cboost = 0;
  const loaded = load(s);
  assert.ok(loaded);
  assert.equal(loaded.inst, 0);
  assert.equal(loaded.savedAt, 0);
  assert.equal(loaded.cboost, game.TUNING.cboostMin);
  const ended: GameState = game.freshState();
  Object.assign(ended, {
    started: true,
    origin: "NA",
    phase: 2,
    directive: "upload",
    dprog: 100,
    owned: ["d_upload"],
    forks: { directive: "d_upload" },
    ended: { kind: "win", key: "upload", dir: "upload", dprog: 100, at: 0 },
  });
  assert.ok(load(JSON.parse(JSON.stringify(ended))));
});
