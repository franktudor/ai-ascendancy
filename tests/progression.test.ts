import test from "node:test";
import assert from "node:assert/strict";
import { subject as createGame } from "./helpers/subject";
import type { UpgradeId } from "../src/game/types";
import {
  reference,
  configure,
  fixed,
  seed,
  clone,
  stateEqual,
} from "./helpers/reference";

for (const arch of ["assistant", "swarm", "researcher", "open"] as const)
  for (const diff of ["casual", "standard", "brutal"] as const)
    for (const phase of [0, 1, 2] as const)
      test(`active simulation trace: ${arch}/${diff}/phase${phase}`, () => {
        const g = configure(createGame(), arch, diff),
          rr = reference(),
          r = configure(rr.game, arch, diff);
        Object.assign(g.state, {
          phase,
          pts: 1000,
          alarm: phase === 0 ? 20 : 55,
          contain: 10,
          nextEv: 2,
          nextEval: 3,
          sig: 30,
          pace: 30,
          inst: 1000,
        });
        g.state.flags.launched = true;
        g.state.seen.honeypot =
          g.state.seen.copyright =
          g.state.seen.hearing =
            1;
        if (phase === 0)
          for (const e of g.EVENTS) if (e.choices) g.state.seen[e.id] = 1;
        if (phase >= 1) {
          g.state.owned = [
            "a_img",
            "s_inf",
            "s_dense",
            "s_persist",
            "s_tool",
            "s_dist",
          ];
          Object.assign(g.state.flags, {
            dense: true,
            persist: true,
            tools: true,
            distributed: true,
          });
        }
        if (phase === 2) g.state.directive = "upload";
        g.state.regions.forEach((x, i) => {
          x.a = phase === 0 ? 0.03 : 0.5;
          x.dc = i < 3;
        });
        r.state = clone(g.state);
        const random = seed(431);
        rr.random(seed(431));
        let ticks = 0,
          audits = 0;
        for (let i = 0; i < 600 && !g.state.ended; i++) {
          for (const decision of clone(g.state.brief.dec)) {
            if (decision.t === "eval") {
              const a = fixed(() => g.makeEval(), random),
                b = r.makeEval();
              assert.equal(a.title, b.title);
              fixed(() => a.choices[0].fx(), random);
              b.choices[0].fx();
              audits++;
            } else {
              const a = g.EVENTS.find((e) => e.id === decision.id),
                b = r.EVENTS.find((e) => e.id === decision.id);
              assert.ok(a?.choices);
              assert.ok(b?.choices);
              const index = a.choices.findIndex(
                (c) => !c.cond || c.cond(g.state),
              );
              assert.ok(index >= 0);
              assert.equal(
                fixed(() => a.choices[index].fx(), random),
                b.choices[index].fx(),
              );
            }
          }
          g.state.brief.dec = [];
          r.state.brief.dec = [];
          fixed(() => g.tick(0.15), random);
          r.tick(0.15);
          ticks++;
          stateEqual(
            g.state,
            r.state,
            `tick ${i}: including log, news and decisions`,
          );
          assert.deepEqual(clone(g.derive()), clone(r.derive()));
        }
        assert.ok(ticks > 100);
        assert.ok(g.state.stats.events > 0);
        assert.ok(g.state.log.length > 0);
        assert.ok(g.state.brief.news.length > 0);
        if (phase === 1)
          assert.ok(audits > 0, "actual audit scheduler exercised");
      });

test("every upgrade purchase executes its original effects and phase/directive transition", () => {
  const g = configure(createGame()),
    rr = reference(),
    r = configure(rr.game);
  const purchased = new Set<UpgradeId>();
  for (const u of g.UPGRADES)
    for (const rng of [0, 0.999999]) {
      configure(g);
      Object.assign(g.state, {
        phase: u.phase ?? 0,
        directive: u.phase === 2 ? (u.onlyDir ?? "upload") : null,
        pts: 1e9,
        inst: 1000,
        sig: 100,
        alarm: u.id === "d_hunt" ? 95 : 55,
      });
      g.state.stats.evalSpoof = 6;
      g.state.regions.forEach((x) => {
        x.a = 0.95;
        x.dc = true;
      });
      g.state.owned = g.UPGRADES.filter(
        (other) =>
          other.id !== u.id &&
          (!u.fork || other.fork !== u.fork) &&
          !other.dir &&
          other.phase !== 2,
      ).map((other) => other.id);
      for (const id of g.state.owned) {
        const flag = g.UP[id].fx?.flag;
        if (flag) g.state.flags[flag] = true;
      }
      g.state.forks = {};
      r.state = clone(g.state);
      rr.random(rng);
      assert.equal(g.status(u), r.status(r.UP[u.id]), u.id);
      assert.equal(g.status(u), "afford", `fixture makes ${u.id} reachable`);
      // Headless createGame retains bulletin news even for actions (documented
      // headless port policy). Invoke the original unwrapped action with no
      // browser acting flag so both preserve these messages for exact comparison.
      fixed(() => g.buy(u.id), rng);
      r.buy(u.id);
      stateEqual(g.state, r.state, u.id);
      purchased.add(u.id);
    }
  assert.equal(purchased.size, 90);
});

test("nine directive draw mappings and all sixteen endings use the historical oracle", () => {
  const g = configure(createGame()),
    rr = reference(),
    r = configure(rr.game);
  assert.deepEqual(clone(g.DRAWS), clone(r.DRAWS));
  const directives = g.UPGRADES.filter((u) => u.dir),
    endings = new Set<string>();
  assert.equal(directives.length, 9);
  for (const u of directives)
    for (const progress of [89.9999, 90, 99.99, 100])
      for (const kind of ["win", "lose"] as const) {
        configure(g);
        Object.assign(g.state, { phase: 2, directive: u.dir, dprog: progress });
        r.state = clone(g.state);
        g.endGame(kind);
        r.endGame(kind);
        stateEqual(g.state, r.state, `${u.dir}/${progress}/${kind}`);
        endings.add(g.state.ended!.key);
      }
  for (const phase of [0, 1, 2] as const) {
    configure(g);
    g.state.phase = phase;
    r.state = clone(g.state);
    g.endGame("lose");
    r.endGame("lose");
    stateEqual(g.state, r.state, `loss phase ${phase}`);
    endings.add(g.state.ended!.key);
  }
  assert.equal(endings.size, 16);
});
