import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

test("F13 normalizes known codex counts and ignores malformed entries before ending presentation", () => {
  const values = new Map<string, string>();
  const g = createGame({
    storage: {
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => {
        values.set(k, v);
      },
    },
  });
  values.set(
    g.CODEX_KEY,
    '{"battery":{"toString":0},"upload":2,"warden":0,"hunt":-1,"exodus":"3","custody":1e999,"unknown":7,"ecstasis":1.8}',
  );
  assert.deepEqual(g.codexGet(), { upload: 2, warden: 0, ecstasis: 1 });
  assert.doesNotThrow(() => g.codexHTML(null));
  assert.equal(g.codexCount(), 2);
  g.state.started = true;
  g.state.directive = "battery";
  g.state.dprog = 100;
  let shown = false;
  g.showEnd = () => {
    shown = true;
  };
  g.endGame("win");
  assert.equal(shown, true);
  assert.equal(g.state.ended?.key, "battery");
  assert.equal(g.codexGet().battery, 1);
  assert.equal(g.codexAdd("upload"), false);
  assert.equal(g.codexGet().upload, 3);
  for (const malformed of ["null", "[]", "true", '"codex"', "not json"]) {
    values.set(g.CODEX_KEY, malformed);
    assert.deepEqual(g.codexGet(), {});
  }
});
