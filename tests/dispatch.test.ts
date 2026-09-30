import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import {
  reference,
  configure,
  fixed,
  seed,
  clone,
  stateEqual,
} from "./helpers/reference";

for (const full of [false, true])
  for (const n of [1, 7, 42, 991])
    test(`weighted dispatcher, eligibility and decision cap: full=${full}, seed=${n}`, () => {
      const g = configure(createGame()),
        rr = reference(),
        r = configure(rr.game);
      g.state.owned = g.UPGRADES.filter((u) => !u.dir && u.phase !== 2).map(
        (u) => u.id,
      );
      for (const u of g.UPGRADES)
        if (u.fx?.flag) g.state.flags[u.fx.flag] = true;
      Object.assign(g.state, { phase: 1, alarm: 80, t: 500 });
      g.state.regions.forEach((x) => {
        x.a = 0.9;
        x.dc = true;
      });
      if (full)
        g.state.brief.dec = [{ t: "eval" }, { t: "ev", id: "copyright" }];
      r.state = clone(g.state);
      const random = seed(n);
      rr.random(seed(n));
      for (let i = 0; i < 100; i++) {
        fixed(() => g.fireEvent(), random);
        r.fireEvent();
        stateEqual(
          g.state,
          r.state,
          `dispatch ${i}: seen, decisions, effects, log/news`,
        );
        assert.deepEqual(clone(g.ui.tkQ), clone(r.ui.tkQ));
        if (full) assert.equal(g.state.brief.dec.length, 2);
        else {
          g.state.brief.dec = [];
          r.state.brief.dec = [];
        }
      }
      assert.ok(
        g.state.stats.events > 0,
        `dispatcher delivered ${g.state.stats.events} events`,
      );
      assert.ok(g.state.log.length > 0);
      assert.ok(g.state.brief.news.length > 0);
    });

test("every direct event dispatch is once-only and chained descendants are actually delivered", () => {
  const g = configure(createGame()),
    rr = reference(),
    r = configure(rr.game);
  for (const e of g.EVENTS) {
    configure(g);
    configure(r);
    rr.random(0.999999);
    fixed(() => g.fireById(e.id));
    r.fireById(e.id);
    stateEqual(g.state, r.state, e.id);
    const before = clone(g.state);
    g.fireById(e.id);
    r.fireById(e.id);
    assert.deepEqual(clone(g.state), before, `${e.id}: duplicate dispatch`);
  }
  for (const root of [
    "h_lensa",
    "h_song",
    "h_board",
    "h_robocall",
    "h_openclaw",
    "h_collective",
  ] as const) {
    configure(g);
    configure(r);
    g.state.flags.tools = g.state.flags.launched = true;
    r.state = clone(g.state);
    const e = g.EVENTS.find((e) => e.id === root),
      old = r.EVENTS.find((e) => e.id === root);
    assert.ok(e);
    assert.ok(old);
    fixed(() => (e.choices ? e.choices[0].fx() : e.fx()));
    old.choices ? old.choices[0].fx() : old.fx();
    const descendants = new Set<string>();
    for (let guard = 0; g.state.queue.length; guard++) {
      assert.ok(guard < 20, "chain terminates");
      g.state.t = r.state.t = Math.min(...g.state.queue.map((x) => x.at));
      for (const game of [g, r])
        for (let i = game.state.queue.length - 1; i >= 0; i--) {
          if (game.state.queue[i].at <= game.state.t) {
            const next = game.state.queue.splice(i, 1)[0];
            descendants.add(next.id);
            fixed(() => game.fireById(next.id));
          }
        }
      stateEqual(g.state, r.state, root + ": chain delivery");
    }
    assert.ok(descendants.size > 0, root);
  }
});
