import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import {
  reference,
  configure,
  clone,
  fixed,
  stateEqual,
} from "./helpers/reference";

for (const flags of [
  [],
  ["distributed"],
  ["small"],
  ["airdeny"],
  ["foundry"],
] as const)
  for (const rng of [0, 0.999999])
    test(`physical cluster strike branches: ${flags.join("+") || "none"}/${rng}`, () => {
      const g = configure(createGame()),
        rr = reference(),
        r = configure(rr.game);
      Object.assign(g.state, { phase: 1, alarm: 80, t: 500 });
      g.state.regions[0].dc = true;
      for (const flag of flags) g.state.flags[flag] = true;
      r.state = clone(g.state);
      rr.random(rng);
      fixed(() => g.checkStrikes(), rng);
      r.checkStrikes();
      stateEqual(g.state, r.state, "strike: defense/loss/urgent bulletin");
      g.state.t = r.state.t = 545;
      g.checkRebuilds();
      r.checkRebuilds();
      stateEqual(g.state, r.state, "rebuild: stats and real bulletin");
    });
