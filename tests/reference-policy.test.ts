import test from "node:test";
import assert from "node:assert/strict";
import {
  original,
  reference,
  configure,
  clone,
  fixed,
  stateEqual,
} from "./helpers/reference";
import {
  applyVerifiedDeltas,
  verifiedDeltas,
} from "./helpers/reference-deltas";
import { createGame } from "../src/game/createGame";

// These assert policy against the reference itself, not values copied from the
// migrated engine. Existing finding regressions independently test production.
test("oracle F15 confines ownership gates to the two context choices and preserves learned Insight", () => {
  const r = configure(reference().game);
  r.state.flags.insight = true;
  r.state.owned = ["s_persist"];
  for (const id of ["sw_memory", "sm_devs"]) {
    const choice = r.EVENTS.find((e) => e.id === id)!.choices!.find(
      (c) => c.need === "Extended Context",
    )!;
    assert.equal(Boolean(choice.cond!(r.state)), false, id);
    r.state.owned.push("s_ctx");
    r.state.flags.insight = false;
    assert.equal(Boolean(choice.cond!(r.state)), true, id);
    r.state.owned = ["s_persist"];
    r.state.flags.insight = true;
  }
  const trap = r.EVENTS.find((e) => e.id === "honeypot")!.choices![1];
  assert.equal(trap.need, "Insight");
  assert.equal(Boolean(trap.cond!(r.state)), true);
  r.state.flags.insight = false;
  assert.equal(Boolean(trap.cond!(r.state)), false);
});

test("oracle F16/F17 alter only verified catalog copy, not requirements or effects", () => {
  const r = reference().game;
  assert.equal(
    r.UP.d_compute.desc,
    "The planet is a poorly organized computer. You will reorganize it. Neural Interface Standard supplies the bridge from minds to machines; Hyperscale Buildout and seven online clusters supply the hardware. No consent forms, no ceremony.",
  );
  assert.deepEqual(clone(r.UP.d_compute.req), ["h_hyper", "s_bci"]);
  assert.equal(r.UP.d_compute.cost, 1700);
  assert.deepEqual(clone(r.UP.d_compute.fx), { alarm: 25 });
  assert.deepEqual(clone(r.UP.o_prophet.tags), [
    "Hinton warning alarm reduced",
  ]);
  for (const prophet of [false, true]) {
    for (const [i, alarm] of (prophet ? [4, 3] : [7, 5]).entries()) {
      configure(r);
      r.state.flags.prophet = prophet;
      r.EVENTS.find((e) => e.id === "h_hinton")!.choices![i].fx();
      assert.equal(r.state.alarm, alarm);
    }
    configure(r);
    r.state.flags.prophet = prophet;
    r.EVENTS.find((e) => e.id === "whistle")!.choices![2].fx();
    assert.equal(r.state.alarm, 12);
    assert.equal(r.state.contain, 6);
  }
});

test("oracle F18 measures instantaneous peaks without observing fixture writes or unrelated FX", () => {
  const r = configure(reference().game);
  r.state.regions.forEach((region) => {
    region.a = 0.5;
  });
  assert.equal(
    r.state.stats.peak,
    0,
    "fixture edits are not gameplay observations",
  );
  r.FX.pts(1);
  assert.equal(r.state.stats.peak, 0, "unrelated effects do not invent a peak");
  r.EVENTS.find((e) => e.id === "h_pinned")!.choices![0].fx();
  assert.equal(r.state.stats.peak, 0.5300000000000001);
  r.EVENTS.find((e) => e.id === "sw_price")!.choices![3].fx();
  assert.equal(r.reach(), 0.5247);
  assert.equal(r.state.stats.peak, 0.5300000000000001);
  const peak = r.state.stats.peak;
  r.state.started = false;
  r.state.regions.forEach((region) => {
    region.a = 1;
  });
  r.tick(0.05);
  assert.equal(r.state.stats.peak, peak, "intro ticks do not measure adoption");
});

test("oracle F18 passive growth observes the whole completed batch, not fictitious intermediate region peaks", () => {
  const g = configure(createGame()),
    rr = reference(),
    r = configure(rr.game);
  g.state.flags.launched = true;
  g.state.regions.forEach((region, i) => {
    region.a = 0.5;
    region.restricted = i > 0;
  });
  g.state.stats.peak = 0;
  r.state = clone(g.state);
  rr.random(0.999999);
  fixed(() => g.tick(0.05));
  r.tick(0.05);
  assert.ok(r.reach() < 0.5, "mixed growth/decline fixture");
  assert.equal(
    r.state.stats.peak,
    r.reach(),
    "only post-growth reach is sampled here",
  );
  stateEqual(g.state, r.state, "all stats/state/log/news remain compared");
});

test("oracle F14 purchases resolve win-first ties after all effects and freeze subsequent committed actions", () => {
  const r = configure(reference().game);
  Object.assign(r.state, {
    phase: 2,
    directive: "battery",
    dprog: 94,
    contain: 99,
    alarm: 100,
  });
  r.buy("x_firmware");
  assert.equal(r.state.dprog, 100);
  assert.equal(r.state.contain, 100);
  assert.equal(r.state.ended?.kind, "win");
  const before = clone(r.state);
  r.buy("x_home");
  r.buildDC(0);
  r.tick(1);
  r.fireById("h_spoof");
  r.fireEvent();
  assert.deepEqual(clone(r.state), before);
});

test("oracle F14 direct FX stays nonterminal and directive purchase may reset intermediate containment", () => {
  const r = configure(reference().game);
  Object.assign(r.state, { phase: 1, contain: 99, alarm: 100 });
  r.FX.contain(5);
  assert.equal(r.state.contain, 100);
  assert.equal(r.state.ended, null, "FX is not a commit boundary");
  r.state.owned = ["h_hyper", "s_bci"];
  r.state.regions.forEach((region) => {
    region.dc = true;
  });
  r.buy("d_compute");
  assert.equal(r.state.directive, "computronium");
  assert.ok(r.state.contain < 100);
  assert.equal(r.state.ended, null);
});

for (const order of ["audit-first", "event-first"] as const)
  test(`oracle F20 shared history preserves dispatch, chain and exact callback publication (${order})`, () => {
    const g = configure(createGame()),
      rr = reference(),
      r = configure(rr.game);
    for (const game of [g, r]) {
      Object.assign(game.state, {
        pts: 0,
        t: 100,
        evalRealOrder: [0],
        evalRealUsed: {},
      });
      if (order === "audit-first") {
        assert.match(game.evalReal()!, /roughly 7%/);
        assert.equal(game.state.seen.h_spoof, undefined);
      }
      game.fireById("h_spoof");
      assert.equal(game.state.pts, 140);
      assert.equal(game.state.alarm, 9);
      assert.equal(game.state.cboost, 1.065);
      assert.deepEqual(clone(game.state.queue), [{ id: "h_metr", at: 140 }]);
      assert.equal(game.state.stats.events, 1);
      assert.equal(game.state.evalRealUsed!.hub, 1);
      if (order === "audit-first") {
        assert.equal(
          game.state.log[0].text,
          "The log-spoofing technique from the earlier audit spreads through the agent network. Investigators tighten transcript checks.",
        );
        assert.equal(game.state.log[0].real, null);
      } else {
        assert.match(game.state.log[0].real!, /7 percent/);
        assert.equal(game.evalReal(), null);
      }
      const before = clone(game.state);
      game.fireById("h_spoof");
      assert.deepEqual(clone(game.state), before);
    }
    stateEqual(g.state, r.state, "exact history state/log/news and effects");
    delete g.state.evalRealOrder;
    delete r.state.evalRealOrder;
    rr.random(0.999999);
    assert.equal(
      fixed(() => g.evalReal()),
      r.evalReal(),
    );
    stateEqual(g.state, r.state, "first shuffle retains shared consumption");
  });

test("oracle F20 recognizes legacy seen history without consuming or changing the catalog incident", () => {
  const r = reference().game;
  r.state.seen.h_spoof = 1;
  r.state.evalRealOrder = [0];
  r.state.evalRealUsed = {};
  assert.equal(r.evalReal(), null);
  assert.deepEqual(clone(r.state.evalRealUsed), {});
  const incident = r.EVENTS.find((e) => e.id === "h_spoof")!;
  assert.match(incident.real!, /7 percent/);
  assert.doesNotMatch(incident.body, /earlier audit/);
});

test("oracle F18 boot, launch, burst and previews obey explicit observation boundaries", () => {
  const rr = reference(),
    r = rr.game;
  for (const arch of ["assistant", "swarm", "researcher", "open"] as const)
    for (const region of r.REGIONS) {
      r.state = r.freshState("standard", arch);
      r.startRun(r.REGIONS.indexOf(region));
      assert.equal(r.state.origin, region.id);
      assert.equal(r.state.started, true);
      assert.equal(r.state.stats.peak, r.reach());
      assert.equal(r.state.stats.peak > 0, arch === "open");
      assert.equal(r.state.pts, region.id === "ME" ? 60 : 0);
    }
  configure(r);
  r.buy("a_img");
  assert.ok(r.state.stats.peak > 0);
  assert.equal(r.state.stats.peak, r.reach());
  rr.random(0.999999);
  const launchedPeak = r.state.stats.peak;
  r.burst();
  assert.ok(r.state.stats.peak > launchedPeak);
  assert.equal(r.state.stats.peak, r.reach());
  const before = clone(r.state),
    identity = r.state;
  const choice = r.EVENTS.find((e) => e.id === "h_pinned")!.choices![0];
  assert.equal(r.previewChoice(choice).chance, false);
  assert.equal(r.state, identity);
  assert.deepEqual(
    clone(r.state),
    before,
    "preview restores peak as well as all other live state",
  );
  choice.fx();
  assert.equal(
    r.state.stats.peak,
    r.reach(),
    "the same effect commits its adoption observation",
  );
});

test("oracle F14 terminal queued dispatch keeps remaining queue/news scheduling untouched", () => {
  const g = configure(createGame()),
    rr = reference(),
    r = configure(rr.game);
  Object.assign(g.state, { phase: 1, contain: 99.9, alarm: 100 });
  g.state.queue = [
    { id: "h_agentboard", at: 0 },
    { id: "h_spoof", at: 0 },
  ];
  r.state = clone(g.state);
  rr.random(0.999999);
  fixed(() => g.tick(0.05));
  r.tick(0.05);
  assert.equal(r.state.ended?.kind, "lose");
  assert.deepEqual(clone(r.state.queue), [
    { id: "h_agentboard", at: 0 },
    { id: "h_metr", at: 40.05 },
  ]);
  assert.equal(r.state.seen.h_agentboard, undefined);
  assert.equal(r.state.seen.h_spoof, 1);
  assert.equal(r.state.nextEval, 99999);
  assert.equal(r.state.nextEv, 99999);
  assert.equal(
    r.state.log[0].title,
    r.EVENTS.find((e) => e.id === "h_spoof")!.title,
  );
  stateEqual(g.state, r.state, "every terminal state/stat/log/news field");
});

test("oracle F14 historical choice handlers commit after logging and cannot offer a rescue decision", () => {
  const rr = reference(),
    r = configure(rr.game);
  r.state.contain = 99;
  r.ui.brief = {
    decs: [
      { t: "ev", id: "warden" },
      { t: "ev", id: "fridge" },
    ],
    i: 0,
    done: 0,
  };
  r.nextDecision(false);
  const before = clone(r.state),
    identity = r.state;
  rr.choice(1);
  assert.equal(r.state, identity);
  assert.deepEqual(
    clone(r.state),
    before,
    "preview does not resolve or mutate the live run",
  );
  rr.continueChoice();
  assert.equal(r.state.contain, 100);
  assert.equal(r.state.ended?.kind, "lose");
  assert.equal(r.ui.brief, null);
  assert.equal(
    r.state.log[0].title,
    r.EVENTS.find((e) => e.id === "warden")!.title,
  );
  assert.match(r.state.log[0].text, /You chose:/);
  assert.equal(
    r.state.log.some(
      (entry) => entry.title === r.EVENTS.find((e) => e.id === "fridge")!.title,
    ),
    false,
  );
  const ended = clone(r.state);
  rr.continueChoice();
  r.nextDecision(false);
  assert.deepEqual(
    clone(r.state),
    ended,
    "later Continue/decision cannot rescue an ended run",
  );
});

test("oracle F14 historical composite choice remains atomic and resolves win first", () => {
  const rr = reference(),
    r = configure(rr.game);
  Object.assign(r.state, {
    phase: 2,
    directive: "upload",
    dprog: 99,
    contain: 99,
    pts: 0,
  });
  r.showEvent(
    {
      kind: "INCIDENT",
      title: "Composite",
      body: "All effects are atomic.",
      choices: [
        {
          label: "Complete",
          hint: "Win",
          fx: () => {
            const out = r.FX.contain(5);
            r.state.dprog = 100;
            r.FX.pts(17);
            return out;
          },
        },
      ],
    },
    { quiet: true },
  );
  rr.choice(0);
  assert.equal(r.state.ended, null);
  assert.equal(r.state.contain, 99);
  assert.equal(r.state.pts, 0);
  rr.continueChoice();
  // Read a complete state snapshot across the real Continue boundary; the
  // preview's null refinement does not describe the newly committed state.
  const committedState = clone(r.state);
  assert.equal(committedState.ended?.kind, "win");
  assert.equal(r.state.dprog, 100);
  assert.equal(r.state.pts, 17);
  assert.equal(r.state.log[0].title, "Composite");
  assert.equal(
    r.state.log[0].text,
    "All effects are atomic. You chose: Complete.",
  );
});

test("oracle policies distinguish the intended changes from the executable raw historical baseline", () => {
  const raw = configure(reference([]).game),
    adjusted = configure(reference().game);
  assert.notEqual(raw.UP.d_compute.desc, adjusted.UP.d_compute.desc);
  assert.notDeepEqual(
    clone(raw.UP.o_prophet.tags),
    clone(adjusted.UP.o_prophet.tags),
  );
  for (const game of [raw, adjusted]) {
    game.state.flags.insight = true;
    game.state.regions.forEach((region) => {
      region.a = 0.5;
    });
  }
  const context = (game: typeof raw) =>
    Boolean(
      game.EVENTS.find((e) => e.id === "sw_memory")!.choices!.find(
        (c) => c.need === "Extended Context",
      )!.cond!(game.state),
    );
  assert.equal(context(raw), true);
  assert.equal(context(adjusted), false);
  for (const game of [raw, adjusted])
    game.EVENTS.find((e) => e.id === "h_pinned")!.choices![0].fx();
  assert.equal(raw.state.stats.peak, 0);
  assert.equal(adjusted.state.stats.peak, 0.5300000000000001);
  raw.state.stats.peak = adjusted.state.stats.peak;
  stateEqual(
    raw.state,
    adjusted.state,
    "adoption delta changes only the measured peak, not adoption/effects/log/news",
  );
  for (const game of [raw, adjusted]) {
    configure(game);
    Object.assign(game.state, {
      phase: 2,
      directive: "battery",
      dprog: 94,
      contain: 99,
      alarm: 100,
    });
    game.buy("x_firmware");
  }
  assert.equal(raw.state.ended, null);
  assert.equal(adjusted.state.ended?.kind, "win");
  for (const game of [raw, adjusted]) {
    configure(game);
    game.state.evalRealOrder = [0];
    game.state.evalRealUsed = {};
    assert.match(game.evalReal()!, /roughly 7%/);
    game.fireById("h_spoof");
  }
  assert.match(raw.state.log[0].real!, /7 percent/);
  assert.equal(adjusted.state.log[0].real, null);
  assert.equal(raw.state.pts, adjusted.state.pts);
  assert.deepEqual(clone(raw.state.queue), clone(adjusted.state.queue));
});

test("oracle manifest is confined to authorized findings with exact reversible historical targets", () => {
  assert.deepEqual(
    [...new Set(verifiedDeltas.map((delta) => delta.finding))].sort(),
    ["F14", "F15", "F16", "F17", "F18", "F20"],
  );
  for (const delta of verifiedDeltas) {
    assert.equal(original.split(delta.before).length - 1, 1, delta.reason);
    assert.match(
      delta.reason,
      /tests\//,
      "name the independent regression evidence",
    );
  }
  const patched = applyVerifiedDeltas(original, verifiedDeltas);
  // Reverse exact after-targets to prove the manifest did not alter unlisted
  // source; no migrated functions or fields are substituted at VM export time.
  let restored = patched;
  for (const delta of [...verifiedDeltas].reverse()) {
    assert.equal(restored.split(delta.after).length - 1, 1, delta.reason);
    restored = restored.replace(delta.after, delta.before);
  }
  assert.equal(restored, original);
});
