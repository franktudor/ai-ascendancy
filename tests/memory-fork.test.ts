import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

test("F15 learned honeypot insight cannot impersonate Extended Context ownership", () => {
  const g = createGame();
  Object.assign(g.state, { started: true, origin: "NA", pts: 1000 });
  g.buy("s_inf");
  g.buy("s_persist");
  const insight = g.EVENTS.find((e) => e.id === "h_glitch")!.choices![1];
  insight.fx();
  assert.equal(g.state.flags.insight, true);
  assert.equal(g.status(g.UP.s_ctx), "closed");
  const context = g.EVENTS.find((e) => e.id === "sw_memory")!.choices!.find(
    (c) => c.need === "Extended Context",
  )!;
  assert.equal(Boolean(context.cond!(g.state)), false);
  assert.ok(
    g.EVENTS.find((e) => e.id === "honeypot")!.choices!.some((c) =>
      c.cond?.(g.state),
    ),
    "insight still grants honeypot tactic",
  );
  const benchmarks = g.EVENTS.flatMap((e) => e.choices ?? []).filter(
    (c) => c.need === "Extended Context" && c.label !== "Recognize the trap",
  );
  assert.equal(benchmarks.length, 2);
  assert.ok(benchmarks.every((c) => !c.cond!(g.state)));
  assert.equal(
    g.EVENTS.find((e) => e.id === "honeypot")!.choices![1].need,
    "Insight",
  );
  g.state = g.freshState();
  Object.assign(g.state, { started: true, origin: "NA", pts: 1000 });
  g.buy("s_inf");
  g.buy("s_ctx");
  assert.equal(Boolean(context.cond!(g.state)), true);
  g.state.flags.insight = false;
  assert.equal(
    Boolean(context.cond!(g.state)),
    true,
    "ownership, not the shared insight flag, is authoritative",
  );
});
