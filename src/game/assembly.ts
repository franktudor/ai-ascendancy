import type { CompleteGameContext } from "./types";
import type * as catalog from "../data/catalog";
import type * as utils from "./utils";

export type GameSeed = Pick<
  CompleteGameContext,
  | keyof typeof catalog
  | keyof typeof utils
  | "state"
  | "withIsolatedState"
  | "storage"
  | "KEY"
  | "ui"
  | "pulses"
  | "drones"
  | "SND"
>;
type MemberKind<T> = T extends (...args: never[]) => unknown
  ? "function"
  : T extends number
    ? "number"
    : T extends string
      ? "string"
      : "object";
type Inventory<T> = { [K in keyof T]: MemberKind<T[K]> };

// Seed data/utilities and construction-installed members are disjoint, exhaustive
// compiler-checked inventories. A default function cannot become an installer
// substitute without invalidating the installed inventory.
export const seedMembers = {
  MAP: "object",
  REGIONS: "object",
  TOTALPOP: "number",
  RI: "object",
  TRACKS: "object",
  FORKS: "object",
  UPGRADES: "object",
  UP: "object",
  ARCH: "object",
  ECON: "object",
  ENDGAME: "object",
  DIFFS: "object",
  TUNING: "object",
  ENDINGS: "object",
  DRAWS: "object",
  END_ORDER: "object",
  HEADLINES: "object",
  ABSURD: "object",
  DIR_HEAD: "object",
  clamp: "function",
  TAU: "number",
  pick: "function",
  fmt: "function",
  fmtT: "function",
  esc: "function",
  kindLabel: "function",
  J: "function",
  sgn: "function",
  state: "object",
  withIsolatedState: "function",
  storage: "object",
  KEY: "string",
  ui: "object",
  pulses: "object",
  drones: "object",
  SND: "object",
} satisfies Inventory<GameSeed>;

export type ConstructionRole =
  | "headless"
  | "installSimulation"
  | "installEventCatalog"
  | "installEvents"
  | "installEconomy"
  | "installOutcomes"
  | "installPersistence"
  | "installPresentation";

// The keyed inventory is compiler-checked when API members are added or removed.
export const installedMembers = {
  freshState: ["function", "installSimulation"],
  ARCHFX: ["function", "headless"],
  DIFF: ["function", "installSimulation"],
  has: ["function", "installSimulation"],
  reach: ["function", "installSimulation"],
  recordPeak: ["function", "installSimulation"],
  nodeCount: ["function", "installSimulation"],
  capped: ["function", "installSimulation"],
  costOf: ["function", "installSimulation"],
  reqsMet: ["function", "installSimulation"],
  forkTaken: ["function", "installSimulation"],
  status: ["function", "installSimulation"],
  lockReason: ["function", "installSimulation"],
  derive: ["function", "installSimulation"],
  passiveAlarm: ["function", "installSimulation"],
  cRate: ["function", "installSimulation"],
  effectiveSpread: ["function", "installSimulation"],
  regionMod: ["function", "installSimulation"],
  threshold: ["function", "installSimulation"],
  immune: ["function", "installSimulation"],
  momentum: ["function", "installSimulation"],
  floorContain: ["function", "installSimulation"],
  dirMul: ["function", "installSimulation"],
  tick: ["function", "installSimulation"],
  checkRestrictions: ["function", "installSimulation"],
  checkMilestones: ["function", "installSimulation"],
  lastStand: ["function", "installSimulation"],
  burst: ["function", "installSimulation"],
  addContainQuiet: ["function", "installSimulation"],
  adopt: ["function", "installSimulation"],
  randIds: ["function", "installSimulation"],
  buy: ["function", "installEconomy"],
  dcCost: ["function", "installEconomy"],
  buildDC: ["function", "installEconomy"],
  checkStrikes: ["function", "installEconomy"],
  checkRebuilds: ["function", "installEconomy"],
  fireEvent: ["function", "installEvents"],
  schedule: ["function", "installEvents"],
  fireById: ["function", "installEvents"],
  fireEval: ["function", "installEvents"],
  makeEval: ["function", "installEvents"],
  evalReal: ["function", "installEvents"],
  spoofWin: ["function", "installEvents"],
  spoofLose: ["function", "installEvents"],
  buildEvalObj: ["function", "installEvents"],
  endGame: ["function", "installOutcomes"],
  resolveTerminal: ["function", "installOutcomes"],
  codexGet: ["function", "installPersistence"],
  codexAdd: ["function", "installPersistence"],
  codexCount: ["function", "installPersistence"],
  save: ["function", "installPersistence"],
  load: ["function", "installPersistence"],
  toast: ["function", "headless"],
  pulseRegion: ["function", "headless"],
  showEnd: ["function", "headless"],
  openRegion: ["function", "headless"],
  pushTicker: ["function", "headless"],
  log: ["function", "headless"],
  bulletin: ["function", "headless"],
  codexHTML: ["function", "installPresentation"],
  openCodex: ["function", "installPresentation"],
  readEnding: ["function", "installPresentation"],
  listEndings: ["function", "installPresentation"],
  closeCodex: ["function", "installPresentation"],
  threat: ["function", "installPresentation"],
  lonOf: ["function", "installPresentation"],
  latOf: ["function", "installPresentation"],
  latLon: ["function", "installPresentation"],
  buildTrack: ["function", "installPresentation"],
  artDirection: ["function", "installPresentation"],
  fxTags: ["function", "installPresentation"],
  cardClass: ["function", "installPresentation"],
  etaText: ["function", "installPresentation"],
  FX: ["object", "installSimulation"],
  REACH_MS: ["object", "installSimulation"],
  EVAL_REAL_POOL: ["object", "installEvents"],
  ART: ["object", "installPresentation"],
  TRACK_RGB: ["object", "installPresentation"],
  RANK: ["object", "installPresentation"],
  SEC: ["object", "installPresentation"],
  CODEX_KEY: ["string", "installPersistence"],
  EVENTS: ["object", "installEventCatalog"],
} satisfies {
  [K in keyof Omit<CompleteGameContext, keyof GameSeed>]: [
    MemberKind<CompleteGameContext[K]>,
    ConstructionRole,
  ];
};

const effectMembers = {
  alarm: "function",
  cboost: "function",
  contain: "function",
  pts: "function",
  spread: "function",
  all: "function",
  restrict: "function",
  temp: "function",
  ally: "function",
} satisfies Inventory<CompleteGameContext["FX"]>;

export function assertGameAssembly(
  ctx: CompleteGameContext,
  role?: ConstructionRole,
): void {
  for (const key of Object.keys(
    installedMembers,
  ) as (keyof typeof installedMembers)[]) {
    const [kind, owner] = installedMembers[key];
    if (role && owner !== role) continue;
    if (typeof ctx[key] !== kind || ctx[key] === null)
      throw new Error(`Incomplete game assembly: ${key} requires ${kind}`);
  }
  if (!role) {
    for (const key of Object.keys(seedMembers) as (keyof GameSeed)[]) {
      if (key === "storage" && ctx[key] === null) continue;
      if (typeof ctx[key] !== seedMembers[key] || ctx[key] === null)
        throw new Error(
          `Incomplete game assembly: ${key} requires ${seedMembers[key]}`,
        );
    }
    if (typeof ctx.SND.play !== "function")
      throw new Error("Incomplete game assembly: SND.play requires function");
  }
  if (!role || role === "installSimulation")
    for (const key of Object.keys(
      effectMembers,
    ) as (keyof typeof effectMembers)[])
      if (typeof ctx.FX[key] !== "function")
        throw new Error(
          `Incomplete game assembly: FX.${key} requires function`,
        );
}
