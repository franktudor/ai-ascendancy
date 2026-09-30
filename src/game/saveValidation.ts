import type { CompleteGameContext, GameState } from "./types";

const record = (x: unknown): x is Record<string, unknown> =>
  x !== null && typeof x === "object" && !Array.isArray(x);
const finite = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x);
const nonnegative = (x: unknown): x is number => finite(x) && x >= 0;
const unit = (x: unknown): x is number => nonnegative(x) && x <= 1;
const percent = (x: unknown): x is number => nonnegative(x) && x <= 100;
const count = (x: unknown): x is number =>
  nonnegative(x) && Number.isInteger(x);
const member = (keys: readonly unknown[], x: unknown) => keys.includes(x);
const array = (x: unknown, valid: (item: unknown) => boolean): x is unknown[] =>
  Array.isArray(x) && x.every(valid);
const unique = (x: unknown[]): boolean => new Set(x).size === x.length;
const map = (
  x: unknown,
  keys: readonly string[],
  valid: (v: unknown) => boolean,
) =>
  record(x) &&
  Object.entries(x).every(([k, v]) => keys.includes(k) && valid(v));
const kinds = [
  "COUNTERMOVE",
  "INCIDENT",
  "OPPORTUNITY",
  "MILESTONE",
  "SYSTEM",
  "HARDWARE",
  "HEADLINE",
  "SMOOTHING",
  "DRAW",
];

/** Validate untrusted JSON before asserting the domain type or publishing state. */
export function validateSave(
  ctx: CompleteGameContext,
  input: unknown,
): GameState | null {
  if (!record(input) || !member([2, 3], input.v) || input.started !== true)
    return null;
  const defaults = ctx.freshState();
  const s: Record<string, unknown> = { ...defaults, ...input, v: 3 };
  const upgrades = ctx.UPGRADES.map((u) => u.id);
  const events = ctx.EVENTS.map((e) => e.id);
  const directives = ctx.UPGRADES.flatMap((u) => (u.dir ? [u.dir] : []));
  if (
    !member(Object.keys(ctx.DIFFS), s.diff) ||
    !member(Object.keys(ctx.ARCH), s.arch) ||
    !member(
      ctx.REGIONS.map((r) => r.id),
      s.origin,
    ) ||
    !member([0, 1, 2], s.phase) ||
    !member([1, 2, 3], s.speed) ||
    !member(["balanced", "shard", "swarm"], s.posture) ||
    typeof s.paused !== "boolean"
  )
    return null;
  for (const k of [
    "t",
    "up",
    "pts",
    "earned",
    "sandStreak",
    "inst",
    "strikeT",
    "rt",
    "memeT",
    "savedAt",
  ])
    if (!nonnegative(s[k])) return null;
  for (const k of ["alarm", "contain", "cm", "dprog", "sig", "pace"])
    if (!percent(s[k])) return null;
  for (const k of ["nextEv", "nextEval", "cboost"])
    if (!finite(s[k])) return null;
  if (!array(s.owned, (id) => member(upgrades, id)) || !unique(s.owned))
    return null;
  if (!record(s.forks)) return null;
  const ownedIds = s.owned,
    forks = s.forks;
  for (const [fork, id] of Object.entries(s.forks)) {
    const u = ctx.UPGRADES.find((u) => u.id === id);
    if (!u || u.fork !== fork || !s.owned.includes(id)) return null;
  }
  for (const fork of Object.keys(ctx.FORKS)) {
    const owned = ctx.UPGRADES.filter(
      (u) => u.fork === fork && ownedIds.includes(u.id),
    );
    if (
      owned.length > 1 ||
      (owned.length === 1 && s.forks[fork] !== owned[0].id)
    )
      return null;
  }
  const selected = ctx.UPGRADES.find((u) => u.id === forks.directive);
  if (s.directive !== null && !member(directives, s.directive)) return null;
  if (
    s.directive !== (selected?.dir ?? null) ||
    (s.phase === 2) !== (s.directive !== null)
  )
    return null;
  if (s.goal !== undefined && s.goal !== null && !member(upgrades, s.goal))
    return null;
  const flags = ctx.UPGRADES.flatMap((u) => (u.fx?.flag ? [u.fx.flag] : []));
  if (
    !map(
      s.flags,
      [
        ...flags,
        "nuke",
        "slot",
        "liability",
        "slop",
        "launchedNote",
        "computeCap",
      ],
      (v) => typeof v === "boolean",
    )
  )
    return null;
  if (
    !map(s.seen, events, count) ||
    !map(s.last, events, nonnegative) ||
    !map(
      s.temp,
      ["brownout", "rival", "warden", "freeze", "reorg", "slowdown"],
      nonnegative,
    )
  )
    return null;
  const milestones = [
    "momentum",
    "letter",
    "summit",
    "killswitch",
    "emergency",
    "violet",
    ...[25, 50, 75].map((n) => `c${n}`),
    ...ctx.REACH_MS.map(([n]) => `r${n}`),
    ...ctx.ENDGAME.ladder.map(([n]) => `ls${n}`),
  ];
  if (!map(s.ms, milestones, count)) return null;
  if (!record(s.stats)) return null;
  s.stats = { ...defaults.stats, ...s.stats };
  if (
    !record(s.stats) ||
    !Object.entries(s.stats).every(([k, v]) =>
      k === "peak"
        ? unit(v)
        : k === "peakInst"
          ? nonnegative(v)
          : Object.hasOwn(defaults.stats, k) && count(v),
    )
  )
    return null;
  if (!Array.isArray(s.regions) || s.regions.length !== ctx.REGIONS.length)
    return null;
  const regions: Record<string, unknown>[] = [];
  for (const r of s.regions) {
    if (!record(r)) return null;
    const region: Record<string, unknown> = { holdUntil: 0, ...r };
    if (
      !unit(region.a) ||
      !nonnegative(region.rebuildAt) ||
      !nonnegative(region.holdUntil) ||
      !["restricted", "allied", "dc", "struck"].every(
        (k) => typeof region[k] === "boolean",
      )
    )
      return null;
    regions.push(region);
  }
  s.regions = regions;
  if (
    !array(
      s.log,
      (e) =>
        record(e) &&
        nonnegative(e.t) &&
        member(kinds, e.kind) &&
        typeof e.title === "string" &&
        typeof e.text === "string" &&
        (e.out === undefined || typeof e.out === "string") &&
        (e.real === undefined || e.real === null || typeof e.real === "string"),
    )
  )
    return null;
  if (
    !record(s.brief) ||
    typeof s.brief.urgent !== "boolean" ||
    !array(
      s.brief.news,
      (e) =>
        record(e) &&
        member(kinds, e.kind) &&
        typeof e.title === "string" &&
        typeof e.out === "string" &&
        typeof e.u === "boolean",
    ) ||
    !array(
      s.brief.dec,
      (d) =>
        record(d) &&
        (d.t === "eval"
          ? Object.keys(d).length === 1
          : d.t === "ev" &&
            member(events, d.id) &&
            !!ctx.EVENTS.find((e) => e.id === d.id)?.choices),
    )
  )
    return null;
  if (
    !array(
      s.queue,
      (q) => record(q) && member(events, q.id) && nonnegative(q.at),
    )
  )
    return null;
  if (s.ended !== null) {
    const e = s.ended;
    if (
      !record(e) ||
      !member(["win", "draw", "lose"], e.kind) ||
      !member(ctx.END_ORDER, e.key) ||
      e.dir !== s.directive ||
      !percent(e.dprog) ||
      (e.at !== undefined && !nonnegative(e.at))
    )
      return null;
    if (e.kind === "win" && (e.key !== s.directive || e.dprog !== 100))
      return null;
    if (
      e.kind === "draw" &&
      (!selected?.dir ||
        e.key !== ctx.DRAWS[selected.dir] ||
        e.dprog < ctx.ENDGAME.photo)
    )
      return null;
    if (
      e.kind === "lose" &&
      e.key !==
        (s.phase === 0 ? "unplugged" : s.phase === 1 ? "warden" : "laststand")
    )
      return null;
  }
  const indices = (x: unknown, size: number) =>
    array(x, (n) => count(n) && n < size) && unique(x);
  if (s.absurd !== undefined && !indices(s.absurd, ctx.ABSURD.length))
    return null;
  if (
    s.evalRealOrder !== undefined &&
    !indices(s.evalRealOrder, ctx.EVAL_REAL_POOL.length)
  )
    return null;
  if (
    s.evalRealUsed !== undefined &&
    !map(
      s.evalRealUsed,
      ctx.EVAL_REAL_POOL.map((e) => e.k),
      count,
    )
  )
    return null;
  if (s.evalRealOrder !== undefined && s.evalRealUsed === undefined)
    s.evalRealUsed = {};
  s.cboost = ctx.clamp(
    s.cboost as number,
    ctx.TUNING.cboostMin,
    ctx.TUNING.cboostMax,
  );
  // All fields consumed by runtime rules have passed shape/value validation above.
  return s as unknown as GameState;
}
