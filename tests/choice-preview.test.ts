import test from "node:test";
import assert from "node:assert/strict";
import cp from "node:child_process";
import vm from "node:vm";
import { isReactive, watch } from "vue";
import { createGame } from "../src/game/createGame";
import { installEventController } from "../src/game/eventController";
import type { EventChoice, RuntimeContext } from "../src/game/types";

function game() {
  // Only previewChoice is invoked headlessly; no uninstalled DOM port is used.
  const g = createGame() as RuntimeContext;
  installEventController(g);
  return g;
}

function reference() {
  const original = cp
    .execFileSync("git", ["show", "72c1ba9:index.html"], {
      maxBuffer: 10_000_000,
    })
    .toString("utf8");
  const start = original.indexOf("'use strict';");
  const script = original.slice(start, original.indexOf("</script>", start));
  const sandbox = {
    Math: Object.create(Math) as Math,
    Date,
    performance: { now: () => 0 },
    matchMedia: () => ({ matches: true }),
    document: { querySelector: () => ({ getContext: () => ({}) }) },
    localStorage: { getItem: () => null, setItem: () => {} },
    window: {},
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    script.slice(
      0,
      script.indexOf("addEventListener('resize',setAppHeight);"),
    ) +
      "\nthis.api={get state(){return S},set state(s){S=s},EVENTS,previewChoice};",
    sandbox,
  );
  // The historical VM exports this explicit port; its implementation stays unchanged.
  return (
    sandbox as typeof sandbox & {
      api: Pick<RuntimeContext, "state" | "EVENTS" | "previewChoice">;
    }
  ).api;
}

function populate(g: Pick<RuntimeContext, "state" | "EVENTS">) {
  Object.assign(g.state, {
    started: true,
    origin: "NA",
    pts: 100000,
    phase: 2,
    directive: "upload",
    dprog: 40,
    alarm: 60,
    contain: 40,
    inst: 1000,
    sig: 70,
    pace: 70,
  });
  g.state.regions.forEach((r) => Object.assign(r, { a: 0.5, dc: true }));
  g.state.log = Array.from({ length: 1000 }, (_, i) => {
    const e = g.EVENTS[i % g.EVENTS.length];
    return { t: i, kind: e.kind, title: e.title, text: e.body, real: e.real };
  });
}

test("gamble samples are nonreactive and never replace the published state", () => {
  const g = game();
  populate(g);
  const state = g.state,
    ui = g.ui;
  const before = JSON.stringify(state);
  let publications = 0,
    samples = 0,
    snapshots = 0;
  let reactiveSample = false;
  const unwatch = watch(
    () => g.state,
    () => publications++,
    { flush: "sync" },
  );
  const stringify = JSON.stringify;
  JSON.stringify = new Proxy(stringify, {
    apply(target, receiver: unknown, args: unknown[]) {
      snapshots++;
      return Reflect.apply(target, receiver, args) as string;
    },
  });
  try {
    const result = g.previewChoice({
      label: "Gamble",
      hint: "",
      fx: () => {
        samples++;
        reactiveSample ||=
          isReactive(g.state) ||
          isReactive(g.ui) ||
          isReactive(g.state.regions[0]);
        g.ui.mode = "origin";
        return g.FX.pts(Math.random() < 0.5 ? 1 : -1);
      },
    });
    assert.equal(result.chance, true);
    assert.equal(
      reactiveSample,
      false,
      "sample state and UI must not be reactive",
    );
    assert.equal(samples, 200);
    assert.equal(snapshots, 1, "snapshot raw rules state once, not per sample");
    assert.equal(publications, 0, "Vue must never observe preview states");
  } finally {
    JSON.stringify = stringify;
    unwatch();
  }
  assert.equal(g.state, state);
  assert.equal(g.ui, ui);
  assert.equal(g.ui.mode, "intro");
  assert.equal(JSON.stringify(state), before);
});

test("throwing preview effects restore RNG, all UI and effect ports", () => {
  const g = game(),
    state = g.state,
    ui = g.ui;
  const before = JSON.stringify({ state, ui });
  const ports = {
    toast: g.toast,
    bulletin: g.bulletin,
    log: g.log,
    pushTicker: g.pushTicker,
    pulseRegion: g.pulseRegion,
    save: g.save,
    randIds: g.randIds,
    play: g.SND.play,
    random: Math.random,
  };
  g.previewChoice({
    label: "Throw",
    hint: "",
    fx: () => {
      g.state.pts = -10;
      g.ui.mode = "origin";
      g.ui.dirty = false;
      g.ui.tkQ.push("must not leak");
      Math.random();
      g.toast("SYSTEM", "ignored");
      g.save();
      throw new Error("expected preview failure");
    },
  });
  assert.equal(g.state, state);
  assert.equal(g.ui, ui);
  assert.equal(JSON.stringify({ state, ui }), before);
  assert.deepEqual(
    {
      toast: g.toast,
      bulletin: g.bulletin,
      log: g.log,
      pushTicker: g.pushTicker,
      pulseRegion: g.pulseRegion,
      save: g.save,
      randIds: g.randIds,
      play: g.SND.play,
      random: Math.random,
    },
    ports,
  );
});

test("all 160 original choice previews retain outcomes and isolation", () => {
  const g = game(),
    r = reference();
  populate(g);
  r.state = JSON.parse(JSON.stringify(g.state)) as RuntimeContext["state"];
  const state = g.state,
    ui = g.ui;
  const before = JSON.stringify({ state, ui });
  let count = 0;
  for (const [i, e] of g.EVENTS.entries()) {
    for (const [j, c] of (e.choices ?? []).entries()) {
      const old: EventChoice = r.EVENTS[i].choices![j];
      const expected = r.previewChoice(old);
      const actual = g.previewChoice(c);
      assert.deepEqual(
        actual,
        JSON.parse(JSON.stringify(expected)),
        `${e.id}/${j}`,
      );
      assert.equal(g.state, state);
      assert.equal(g.ui, ui);
      assert.equal(
        JSON.stringify({ state, ui }),
        before,
        `${e.id}/${j} isolation`,
      );
      count++;
    }
  }
  assert.equal(count, 160);
});
