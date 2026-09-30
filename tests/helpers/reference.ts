import { execFileSync } from "node:child_process";
import vm from "node:vm";
import assert from "node:assert/strict";
import { applyVerifiedDeltas, verifiedDeltas } from "./reference-deltas";
import type {
  CompleteGameContext,
  GameState,
  ArchitectureId,
  DifficultyId,
} from "../../src/game/types";

export const original = execFileSync("git", ["show", "72c1ba9:index.html"], {
  maxBuffer: 10_000_000,
}).toString("utf8");
const start = original.indexOf("'use strict';");
const script = applyVerifiedDeltas(
  original.slice(start, original.indexOf("</script>", start)),
  verifiedDeltas,
);
export type ReferenceGame = Pick<
  CompleteGameContext,
  | "state"
  | "ui"
  | "freshState"
  | "tick"
  | "derive"
  | "costOf"
  | "status"
  | "lockReason"
  | "UPGRADES"
  | "UP"
  | "EVENTS"
  | "ENDINGS"
  | "DRAWS"
  | "REGIONS"
  | "FX"
  | "buy"
  | "buildDC"
  | "checkStrikes"
  | "checkRebuilds"
  | "endGame"
  | "makeEval"
  | "fireEval"
  | "fireEvent"
  | "fireById"
  | "schedule"
  | "evalReal"
  | "buildEvalObj"
  | "reach"
  | "log"
  | "bulletin"
  | "checkRestrictions"
  | "checkMilestones"
>;
export function seed(n = 42): () => number {
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
export function fixed<T>(
  fn: () => T,
  random: number | (() => number) = 0.999999,
): T {
  const keep = Math.random;
  Math.random = typeof random === "number" ? () => random : random;
  try {
    return fn();
  } finally {
    Math.random = keep;
  }
}
export function reference() {
  const math = Object.create(Math) as Math;
  math.random = seed();
  const store = new Map<string, string>();
  const sandbox = {
    Math: math,
    Date: class extends Date {
      static now() {
        return 1700000000000;
      }
    },
    performance: { now: () => 0 },
    matchMedia: () => ({ matches: true }),
    document: { querySelector: () => ({ getContext: () => ({}) }) },
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
    window: {},
    console,
  };
  vm.createContext(sandbox);
  const boundary = script.indexOf("addEventListener('resize',setAppHeight);");
  assert.ok(boundary > 0, "historical browser startup boundary");
  vm.runInContext(
    script.slice(0, boundary) +
      `
this.api={get state(){return S},set state(s){S=s},ui:UI,freshState,tick,derive,costOf,status,lockReason,UPGRADES,UP,EVENTS,ENDINGS,DRAWS,REGIONS,FX,buy,buildDC,checkStrikes,checkRebuilds,endGame,makeEval,fireEval,fireEvent,fireById,schedule,evalReal,buildEvalObj,reach,log,bulletin,checkRestrictions,checkMilestones};
toast=interrupt=pulseRegion=showEnd=openRegion=()=>{};SND.play=()=>{};
// The headless API retains action news; route only that presentation port using
// the actual historical bulletin, not transcribed log/news expectations.
{const originalBulletin=bulletin;bulletin=(...args)=>{const was=UI.acting;UI.acting=false;try{return originalBulletin(...args);}finally{UI.acting=was;}};}
`,
    sandbox,
  );
  // Only the explicitly exported historical VM port is asserted. Rule bodies,
  // bulletin/log/news, scheduler, audits and outcomes execute the actual source.
  const game = (sandbox as typeof sandbox & { api: ReferenceGame }).api;
  return {
    game,
    random(value: number | (() => number)) {
      math.random = typeof value === "number" ? () => value : value;
    },
  };
}
// State has no functions. structuredClone is not used on Vue proxies.
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function configure<
  G extends Pick<ReferenceGame, "state" | "freshState">,
>(
  game: G,
  arch: ArchitectureId = "assistant",
  diff: DifficultyId = "standard",
): G {
  game.state = game.freshState(diff, arch);
  Object.assign(game.state, {
    started: true,
    origin: "ME",
    pts: 100000,
    nextEv: 99999,
    nextEval: 99999,
  });
  return game;
}
export function snapshot(state: GameState) {
  const { savedAt: _wallClockSave, ...out } = clone(state);
  if (out.ended) out.ended.at = 1700000000000;
  return out;
}
export function stateEqual(
  actual: GameState,
  expected: GameState,
  label: string,
): void {
  assert.deepEqual(snapshot(actual), snapshot(expected), label);
}
