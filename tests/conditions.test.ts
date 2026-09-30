import test from "node:test";
import assert from "node:assert/strict";
import { subject as createGame } from "./helpers/subject";
import type {
  ArchitectureId,
  DifficultyId,
  FlagId,
  ForkId,
  GameState,
} from "../src/game/types";
import { reference, seed, clone } from "./helpers/reference";

const architectures = ["assistant", "swarm", "researcher", "open"] as const;
const difficulties = ["casual", "standard", "brutal"] as const;
function states(
  g: ReturnType<typeof createGame>,
  arch: ArchitectureId,
  diff: DifficultyId,
): GameState[] {
  const rnd = seed(811);
  const flags = [
    ...new Set<FlagId>([
      ...g.UPGRADES.flatMap((u) => (u.fx?.flag ? [u.fx.flag] : [])),
      "computeCap",
      "nuke",
      "slot",
      "slop",
    ]),
  ];
  return Array.from({ length: 150 }, (_, sample) => {
    const s = clone(g.freshState(diff, arch));
    Object.assign(s, {
      started: true,
      origin: g.REGIONS[sample % 11].id,
      phase: sample % 3,
      pts: rnd() * 10000,
      alarm: Math.floor(rnd() * 101),
      contain: rnd() * 100,
      dprog: rnd() * 100,
      inst: rnd() * 1500,
      sig: rnd() * 100,
      pace: rnd() * 100,
      directive: g.UPGRADES.filter((u) => u.dir)[sample % 9].dir,
    });
    s.owned = g.UPGRADES.filter(() => rnd() < 0.5).map((u) => u.id);
    for (const flag of flags)
      s.flags[flag] = sample < 6 ? sample % 2 === 1 : rnd() < 0.5;
    for (const x of s.regions)
      Object.assign(x, {
        a: sample < 6 ? sample % 2 : rnd(),
        allied: rnd() < 0.2,
        restricted: rnd() < 0.5,
        dc: rnd() < 0.6,
        struck: rnd() < 0.3,
      });
    for (const fork of [
      "core",
      "memory",
      "mask",
      "escape",
      "directive",
    ] satisfies ForkId[]) {
      const options = g.UPGRADES.filter((u) => u.fork === fork);
      if (rnd() < 0.5)
        s.forks[fork] = options[Math.floor(rnd() * options.length)].id;
    }
    s.stats.evalSpoof = Math.floor(rnd() * 12);
    s.stats.evalCaught = Math.floor(rnd() * 6);
    return s;
  });
}
for (const arch of architectures)
  for (const diff of difficulties)
    test(`callable conditions and purchase gates: ${arch}/${diff}`, () => {
      const g = createGame(),
        r = reference().game;
      const exercised = new Map<string, Set<boolean>>();
      const compare = (
        key: string,
        actual: boolean | undefined,
        expected: boolean | undefined,
      ) => {
        assert.equal(actual, expected, key);
        if (expected !== undefined) {
          const outcomes = exercised.get(key) ?? new Set<boolean>();
          outcomes.add(!!expected);
          exercised.set(key, outcomes);
        }
      };
      for (const s of states(g, arch, diff)) {
        g.state = clone(s);
        r.state = clone(s);
        for (const u of g.UPGRADES) {
          const old = r.UP[u.id];
          if (u.cond || old.cond)
            compare(`upgrade:${u.id}`, u.cond?.(g.state), old.cond?.(r.state));
          for (const method of ["costOf", "status", "lockReason"] as const)
            assert.equal(g[method](u), r[method](old), `${method}:${u.id}`);
        }
        for (const e of g.EVENTS) {
          const old = r.EVENTS.find((x) => x.id === e.id);
          assert.ok(old);
          if (e.cond || old.cond)
            compare(`event:${e.id}`, e.cond?.(g.state), old.cond?.(r.state));
          e.choices?.forEach((c, i) => {
            const before = old.choices?.[i];
            assert.ok(before);
            if (c.cond || before.cond)
              compare(
                `choice:${e.id}/${i}`,
                c.cond?.(g.state),
                before.cond?.(r.state),
              );
          });
        }
      }
      assert.equal(
        exercised.size,
        101,
        "9 upgrade + 77 event + 15 choice callables",
      );
      // Some conditions are constants or deliberately impossible for a random state;
      // do not claim exhaustive branch coverage of this finite sampled matrix.
      assert.ok(
        [...exercised.values()].filter((x) => x.size === 2).length >= 90,
        "both truth outcomes for at least 90 callables",
      );
    });
