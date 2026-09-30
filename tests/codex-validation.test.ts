import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

test("F13 normalizes known codex counts and ignores malformed entries before ending presentation", () => {
  const storageValues = new Map<string, string>();
  const migratedGame = createGame({
    storage: {
      getItem: (storageKey) => storageValues.get(storageKey) ?? null,
      setItem: (storageKey, storageValue) => {
        storageValues.set(storageKey, storageValue);
      },
    },
  });
  storageValues.set(
    migratedGame.codexStorageKey,
    '{"battery":{"toString":0},"upload":2,"warden":0,"hunt":-1,"exodus":"3","custody":1e999,"unknown":7,"ecstasis":1.8}',
  );
  assert.deepEqual(migratedGame.getEndingDiscoveryCounts(), {
    upload: 2,
    warden: 0,
    ecstasis: 1,
  });
  assert.doesNotThrow(() => migratedGame.renderCodexHtml(null));
  assert.equal(migratedGame.countDiscoveredEndings(), 2);
  migratedGame.state.started = true;
  migratedGame.state.directive = "battery";
  migratedGame.state.dprog = 100;
  let endingWasShown = false;
  migratedGame.showEnding = () => {
    endingWasShown = true;
  };
  migratedGame.endGame("win");
  assert.equal(endingWasShown, true);
  assert.equal(migratedGame.state.ended?.key, "battery");
  assert.equal(migratedGame.getEndingDiscoveryCounts().battery, 1);
  assert.equal(migratedGame.recordEndingDiscovery("upload"), false);
  assert.equal(migratedGame.getEndingDiscoveryCounts().upload, 3);
  for (const malformedCodexPayload of [
    "null",
    "[]",
    "true",
    '"codex"',
    "not json",
  ]) {
    storageValues.set(migratedGame.codexStorageKey, malformedCodexPayload);
    assert.deepEqual(migratedGame.getEndingDiscoveryCounts(), {});
  }
});
