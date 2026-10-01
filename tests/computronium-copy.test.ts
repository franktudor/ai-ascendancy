import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

test("F16 Computronium copy communicates the retained Neural Interface Standard prerequisite", () => {
  const migratedGame = createGame();
  const computroniumUpgrade = migratedGame.UPGRADE_BY_ID.d_compute;
  assert.match(computroniumUpgrade.description, /Neural Interface Standard/);
  assert.doesNotMatch(
    computroniumUpgrade.description,
    /no headsets|only needs the hardware/i,
  );
  assert.deepEqual(computroniumUpgrade.requiredUpgradeIds, [
    "h_hyper",
    "s_bci",
  ]);
  Object.assign(migratedGame.state, {
    started: true,
    origin: "NA",
    phase: 1,
    pts: 10000,
    owned: ["h_hyper"],
  });
  migratedGame.state.regions.slice(0, 7).forEach((regionState) => {
    regionState.dc = true;
  });
  assert.equal(migratedGame.getUpgradeStatus(computroniumUpgrade), "locked");
  assert.equal(
    migratedGame.getUpgradeLockReason(computroniumUpgrade),
    "Requires Neural Interface Standard",
  );
  migratedGame.state.owned.push("s_bci");
  assert.equal(migratedGame.getUpgradeStatus(computroniumUpgrade), "afford");
  migratedGame.purchaseUpgrade(computroniumUpgrade.id);
  assert.equal(migratedGame.state.directive, "computronium");
});
