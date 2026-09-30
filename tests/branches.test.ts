import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import {
  reference,
  configure,
  clone,
  fixed,
  seed,
  stateEqual,
  snapshot,
} from "./helpers/reference";

for (const flags of [false, true])
  for (const rng of [0, 0.999999, 1, 7, 29, 997])
    test(`every event effect and choice: flags=${flags}, RNG=${rng}`, () => {
      const g = configure(createGame()),
        rr = reference(),
        r = configure(rr.game);
      const events = new Set<string>(),
        choices = new Set<string>();
      let effects = 0;
      for (const e of g.EVENTS) {
        const old = r.EVENTS.find((x) => x.id === e.id);
        assert.ok(old);
        const functions = e.choices ? e.choices.map((c) => c.fx) : [e.fx];
        const originals = old.choices ? old.choices.map((c) => c.fx) : [old.fx];
        for (const [i, fx] of functions.entries()) {
          assert.ok(fx);
          assert.ok(originals[i]);
          const s = clone(g.freshState("brutal", "open"));
          Object.assign(s, {
            started: true,
            origin: "EU",
            phase: 1,
            pts: rng === 0 ? 3 : 200,
            alarm: 95,
            contain: 97,
            cm: 90,
            dprog: 80,
            sig: 100,
            pace: 100,
            inst: 1000,
            directive: "hunt",
            sandStreak: 8,
            cboost: rng === 0 ? 3 : 0.5,
          });
          s.regions.forEach((x, j) =>
            Object.assign(x, {
              a: j % 2 ? 0 : 1,
              restricted: j % 3 === 0,
              dc: j % 2 === 0,
            }),
          );
          for (const u of g.UPGRADES)
            if (u.fx?.flag) s.flags[u.fx.flag] = flags;
          g.state = clone(s);
          r.state = clone(s);
          g.ui.tkQ = [];
          r.ui.tkQ = [];
          const random = rng < 1 ? rng : seed(rng);
          rr.random(rng < 1 ? rng : seed(rng));
          const actual = fixed(() => fx(), random),
            expected = originals[i]();
          assert.equal(actual, expected, `${e.id}/${i}: outcome text`);
          stateEqual(
            g.state,
            r.state,
            `${e.id}/${i}: all state, including log/news`,
          );
          assert.deepEqual(
            clone(g.ui.tkQ),
            clone(r.ui.tkQ),
            `${e.id}/${i}: ticker`,
          );
          events.add(e.id);
          if (e.choices) choices.add(`${e.id}/${i}`);
          effects++;
        }
      }
      assert.equal(events.size, 88);
      assert.equal(choices.size, 160);
      assert.equal(effects, 175);
    });

test("forced low/high RNG reaches both actual gambling outcomes rather than repeating one seed", () => {
  const g = configure(createGame());
  const reached = new Map<string, Set<string>>();
  for (const e of g.EVENTS)
    for (const [i, c] of (e.choices ?? []).entries()) {
      if (
        ![
          ["honeypot", 0],
          ["sw_mask", 1],
        ].some(([id, index]) => e.id === id && i === index)
      )
        continue;
      for (const rng of [0, 0.999999]) {
        configure(g);
        Object.assign(g.state, {
          phase: 1,
          alarm: 60,
          contain: 40,
          sig: 70,
          pace: 70,
          inst: 1000,
        });
        const outcome = fixed(() => c.fx(), rng);
        const key = `${e.id}/${i}`,
          outcomes = reached.get(key) ?? new Set<string>();
        outcomes.add(outcome + JSON.stringify(snapshot(g.state)));
        reached.set(key, outcomes);
      }
    }
  assert.ok(reached.size > 0);
  for (const [key, outcomes] of reached)
    assert.equal(outcomes.size, 2, `${key}: both gambling outcomes`);
});
