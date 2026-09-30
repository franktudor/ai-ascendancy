import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

test("F17 Prophet advertises only its existing Hinton alarm mitigation", () => {
  const g = createGame();
  assert.deepEqual(g.UP.o_prophet.tags, ["Hinton warning alarm reduced"]);
  for (const prophet of [false, true]) {
    for (const [i, expected] of (prophet ? [4, 3] : [7, 5]).entries()) {
      g.state = g.freshState();
      g.state.pts = 200;
      g.state.flags.prophet = prophet;
      g.EVENTS.find((e) => e.id === "h_hinton")!.choices![i].fx();
      assert.equal(g.state.alarm, expected);
    }
    g.state = g.freshState();
    g.state.flags.prophet = prophet;
    g.EVENTS.find((e) => e.id === "whistle")!.choices![2].fx();
    assert.equal(g.state.alarm, 12);
    assert.equal(g.state.contain, 6);
  }
});
