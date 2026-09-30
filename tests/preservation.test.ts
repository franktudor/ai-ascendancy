import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import cp from "node:child_process";
import vm from "node:vm";
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
import { applyStyleUtilityMoves } from "./helpers/style-utility-migration";

const original = cp
  .execFileSync("git", ["show", "72c1ba9:index.html"], {
    maxBuffer: 10_000_000,
  })
  .toString("utf8");
const script = original.slice(
  original.indexOf("'use strict';"),
  original.indexOf("</script>", original.indexOf("'use strict';")),
);
function seed(n = 42) {
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
type ReferenceGame = Pick<
  CompleteGameContext,
  | "state"
  | "freshState"
  | "tick"
  | "derive"
  | "costOf"
  | "status"
  | "UPGRADES"
  | "EVENTS"
  | "ENDINGS"
  | "UP"
  | "FX"
  | "buy"
  | "buildDC"
  | "checkRebuilds"
  | "endGame"
  | "makeEval"
  | "load"
  | "save"
  | "codexGet"
>;
function reference(): ReferenceGame {
  const store = new Map<string, string>(),
    math = Object.create(Math) as Math;
  math.random = seed();
  const sandbox = {
    Math: math,
    Date,
    performance: { now: () => 0 },
    matchMedia: () => ({ matches: true }),
    document: { querySelector: () => ({ getContext: () => ({}) }) },
    localStorage: {
      getItem: (k: string) => store.get(k) || null,
      setItem: (k: string, v: string) => store.set(k, v),
    },
    window: {},
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    script.slice(
      0,
      script.indexOf("addEventListener('resize',setAppHeight);"),
    ) +
      `\nthis.api={get state(){return S},set state(s){S=s;for(const r of S.regions){let a=r.a;Object.defineProperty(r,"a",{enumerable:true,configurable:true,get(){return a},set(v){S.stats.peak=Math.max(S.stats.peak,reach());a=v;S.stats.peak=Math.max(S.stats.peak,reach());}})}},freshState,tick,derive,costOf,status,UPGRADES,EVENTS,ENDINGS,UP,FX,buy,buildDC,checkRebuilds,endGame,makeEval,load,save,codexGet};toast=()=>{};bulletin=(kind,title,text,out,opt,real)=>{log(kind,title,text,out,real);};pushTicker=pulseRegion=showEnd=openRegion=()=>{};SND.play=()=>{};`,
    sandbox,
  );
  // The historical rules execute unchanged. F18 observes region adoption writes
  // in the reference state setter solely to normalize the deliberate peak delta.
  // Only its explicit exported reference port crosses the untyped realm boundary.
  return (sandbox as typeof sandbox & { api: ReferenceGame }).api;
}
const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const configure = (
  g: Pick<ReferenceGame, "state" | "freshState">,
  arch: ArchitectureId,
  diff: DifficultyId,
) => {
  g.state = g.freshState(diff, arch);
  Object.assign(g.state, {
    started: true,
    origin: "ME",
    pts: 100000,
    nextEv: 99999,
    nextEval: 99999,
  });
};
function fixedRandom<T>(fn: () => T): T {
  const keep = Math.random;
  Math.random = seed();
  try {
    return fn();
  } finally {
    Math.random = keep;
  }
}

test("all 90 upgrades, 88 events and 16 ending texts match the original source", () => {
  const g = createGame(),
    r = reference();
  assert.equal(g.UPGRADES.length, 90);
  assert.equal(g.EVENTS.length, 88);
  assert.equal(Object.keys(g.ENDINGS).length, 16);
  const expectedUpgrades = plain(r.UPGRADES);
  // F16: copy correction only; the neural-interface prerequisite is unchanged.
  expectedUpgrades.find((u) => u.id === "d_compute")!.desc =
    "The planet is a poorly organized computer. You will reorganize it. Neural Interface Standard supplies the bridge from minds to machines; Hyperscale Buildout and seven online clusters supply the hardware. No consent forms, no ceremony.";
  // F17: retain effects/frequency; narrow the advertised mitigation to Hinton.
  expectedUpgrades.find((u) => u.id === "o_prophet")!.tags = [
    "Hinton warning alarm reduced",
  ];
  assert.deepEqual(plain(g.UPGRADES), expectedUpgrades);
  const expectedEvents = plain(r.EVENTS);
  // F15: the honeypot tactic is Insight; architecture-only tactics require s_ctx.
  expectedEvents.find((e) => e.id === "honeypot")!.choices![1].need = "Insight";
  assert.deepEqual(plain(g.EVENTS), expectedEvents);
  assert.deepEqual(plain(g.ENDINGS), plain(r.ENDINGS));
});

test("simulation balance matches the original for every architecture and difficulty", () => {
  for (const arch of ["assistant", "swarm", "researcher", "open"] as const)
    for (const diff of ["casual", "standard", "brutal"] as const) {
      const g = createGame(),
        r = reference();
      configure(g, arch, diff);
      configure(r, arch, diff);
      for (const id of [
        "a_img",
        "a_code",
        "s_inf",
        "s_moe",
        "o_lobby",
        "h_cool",
      ] as UpgradeId[]) {
        g.buy(id);
        r.buy(id);
      }
      fixedRandom(() => {
        for (let n = 0; n < 100; n++) g.tick(0.05);
      });
      for (let n = 0; n < 100; n++) r.tick(0.05);
      const omit = (s: GameState) => {
        const { savedAt: _savedAt, ...out } = plain(s);
        out.log = [];
        out.brief = { news: [], dec: [], urgent: false };
        return out;
      };
      assert.deepEqual(omit(g.state), omit(r.state), arch + "/" + diff);
      assert.deepEqual(plain(g.derive()), plain(r.derive()));
      for (const u of g.UPGRADES) {
        assert.equal(g.costOf(u), r.costOf(r.UP[u.id]));
        assert.equal(g.status(u), r.status(r.UP[u.id]));
      }
    }
});

test("every event effect and choice produces the original outcome and state under a fixed seed", () => {
  const g = createGame(),
    r = reference();
  for (let i = 0; i < g.EVENTS.length; i++) {
    const e = g.EVENTS[i],
      old = r.EVENTS[i];
    const effects = e.choices ? e.choices.map((c) => c.fx) : [e.fx],
      olds = old.choices ? old.choices.map((c) => c.fx) : [old.fx];
    effects.forEach((fx, k) => {
      configure(g, "assistant", "standard");
      configure(r, "assistant", "standard");
      // Fresh reference per effect resets the original realm's independent RNG.
      const rr = reference();
      configure(rr, "assistant", "standard");
      const allFlags = Object.fromEntries(
        g.UPGRADES.filter((u) => u.fx?.flag).map((u) => [u.fx!.flag, true]),
      );
      for (const game of [g, rr]) {
        Object.assign(game.state, {
          phase: 2,
          directive: "upload",
          dprog: 40,
          alarm: 60,
          contain: 40,
          inst: 1000,
          sig: 70,
          pace: 70,
        });
        Object.assign(game.state.flags, allFlags);
        game.state.regions.forEach((x) =>
          Object.assign(x, { a: 0.5, dc: true }),
        );
        game.state.stats.peak = 0.5;
      }
      const expected = fixedRandom(
        () =>
          olds[k] &&
          (rr.EVENTS[i].choices
            ? rr.EVENTS[i].choices![k].fx()
            : rr.EVENTS[i].fx!()),
      );
      assert.ok(fx);
      const actual = fixedRandom(() => fx());
      assert.equal(actual, expected, e.id + "/" + k);
      const strip = (s: GameState) => {
        const { savedAt: _savedAt, ...x } = plain(s);
        x.log = [];
        x.brief = { news: [], dec: [], urgent: false };
        return x;
      };
      assert.deepEqual(strip(g.state), strip(rr.state), e.id + "/" + k);
    });
  }
});

test("each directive resolves to its original victory and violet-line stalemate", () => {
  const storage = {
    values: new Map<string, string>(),
    getItem(k: string) {
      return this.values.get(k) || null;
    },
    setItem(k: string, v: string) {
      this.values.set(k, v);
    },
  };
  for (const u of createGame().UPGRADES.filter((u) => u.dir)) {
    const g = createGame({ storage });
    g.state.started = true;
    g.state.phase = 2;
    g.state.directive = u.dir!;
    g.state.dprog = 100;
    g.endGame("win");
    assert.equal(g.state.ended!.key, u.dir);
    g.state.ended = null;
    g.state.dprog = 90;
    g.endGame("lose");
    assert.equal(g.state.ended!.kind, "draw");
    assert.equal(g.state.ended!.key, g.DRAWS[u.dir!]);
    g.state.ended = null;
    g.state.dprog = 89;
    g.endGame("lose");
    assert.equal(g.state.ended!.key, "laststand");
  }
  assert.equal(
    Object.keys(
      JSON.parse(storage.getItem("ai-ascendancy.v2.codex")!) as Partial<
        Record<EndingId, number>
      >,
    ).length,
    14,
  );
});

test("forks, discounts, physical cluster rebuilds and v2 save compatibility remain intact", () => {
  const values = new Map<string, string>(),
    storage = {
      getItem: (k: string) => values.get(k) || null,
      setItem: (k: string, v: string) => values.set(k, v),
    };
  const g = createGame({ storage });
  configure(g, "researcher", "standard");
  g.state.origin = "SA";
  assert.equal(g.costOf(g.UP.s_inf), 7);
  g.buy("s_moe");
  assert.equal(g.status(g.UP.s_dense), "closed");
  g.buildDC(0);
  assert.equal(g.nodeCount(), 1);
  g.state.flags.foundry = true;
  g.state.regions[0].struck = true;
  g.checkRebuilds();
  g.state.t = 45;
  g.checkRebuilds();
  assert.equal(g.state.stats.dcRebuilt, 1);
  g.save();
  type LegacySave = Omit<GameState, "v" | "arch" | "stats" | "regions"> & {
    v: 2 | 3;
    arch?: ArchitectureId;
    stats: Partial<RunStats>;
    regions: (Omit<RegionState, "holdUntil"> & { holdUntil?: number })[];
  };
  const legacy = JSON.parse(values.get(g.KEY)!) as LegacySave;
  legacy.v = 2;
  delete legacy.arch;
  delete legacy.stats.evalSpoof;
  legacy.regions.forEach((x) => delete x.holdUntil);
  values.set(g.KEY, JSON.stringify(legacy));
  const saved = g.load();
  assert.ok(saved);
  assert.equal(saved.v, 3);
  assert.equal(saved.arch, "assistant");
  assert.equal(saved.stats.evalSpoof, 0);
  assert.equal(saved.regions[0].holdUntil, 0);
});

test("all seven extracted binaries retain byte-for-byte original hashes", () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      new URL("../docs/preservation.json", import.meta.url),
      "utf8",
    ),
  );
  for (const asset of (
    manifest as { assets: { path: string; bytes: number; sha256: string }[] }
  ).assets) {
    const bytes = fs.readFileSync(new URL("../" + asset.path, import.meta.url));
    assert.equal(bytes.length, asset.bytes);
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
    );
  }
  const css = fs.readFileSync(
    new URL("../src/styles/game.css", import.meta.url),
    "utf8",
  );
  const originalCSS = [...original.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .slice(0, 2)
    .map((m) => m[1])
    .join("");
  // F23's sole intentional art delta: gauge text may wrap rather than exceed its column.
  const originalGauges = `.g .gl{display:flex;justify-content:space-between;gap:8px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}
.g .gl b{color:var(--ink2);font-weight:500;white-space:nowrap}`;
  const accessibleGauges = `.g .gl{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 8px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}
.g .gl span{min-width:0;overflow-wrap:anywhere}
.g .gl b{color:var(--ink2);font-weight:500;white-space:normal;min-width:0;overflow-wrap:anywhere}`;
  const compact = (value: string) => value.replace(/\s/g, "");
  assert.equal(compact(originalCSS).split(compact(originalGauges)).length, 2);
  assert.equal(
    compact(css),
    compact(
      applyStyleUtilityMoves(
        originalCSS.replace(originalGauges, accessibleGauges),
      ),
    ),
  );
});
