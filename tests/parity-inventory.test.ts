import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import { reference } from "./helpers/reference";

test("coverage inventory names every upgrade/event/choice/directive/ending in the oracle", (t) => {
  const g = createGame(),
    r = reference().game;
  const inventory = {
    upgrades: g.UPGRADES.map((u) => u.id),
    events: g.EVENTS.map((e) => e.id),
    choices: g.EVENTS.flatMap((e) =>
      (e.choices ?? []).map((_, i) => `${e.id}/${i}`),
    ),
    directives: g.UPGRADES.flatMap((u) => (u.dir ? [u.dir] : [])),
    endings: Object.keys(g.ENDINGS),
  };
  for (const [key, count] of [
    ["upgrades", 90],
    ["events", 88],
    ["choices", 160],
    ["directives", 9],
    ["endings", 16],
  ] as const) {
    assert.equal(inventory[key].length, count, key);
    assert.equal(new Set(inventory[key]).size, count, key);
  }
  assert.deepEqual(
    inventory.upgrades,
    Array.from(r.UPGRADES, (u) => u.id),
  );
  assert.deepEqual(
    inventory.events,
    Array.from(r.EVENTS, (e) => e.id),
  );
  assert.deepEqual(
    inventory.choices,
    Array.from(r.EVENTS, (e) =>
      Array.from(e.choices ?? [], (_, i) => `${e.id}/${i}`),
    ).flat(),
  );
  t.diagnostic(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(inventory).map(([key, ids]) => [key, ids.length]),
      ),
    ),
  );
});
