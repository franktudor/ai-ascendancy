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

for (const directive of createGame().UPGRADES.filter((u) => u.dir))
  test(`phase-2 directive progression and competing finish: ${directive.dir}`, () => {
    const g = configure(createGame()),
      rr = reference(),
      r = configure(rr.game);
    for (const progress of [0, 89.99, 99.999])
      for (const containment of [10, 99.999]) {
        configure(g);
        Object.assign(g.state, {
          phase: 2,
          directive: directive.dir,
          dprog: progress,
          contain: containment,
          alarm: 100,
          sig: 100,
          pace: 100,
          inst: 1000,
          cboost: 3,
        });
        g.state.regions.forEach((x) => {
          x.a = 1;
          x.dc = true;
        });
        g.state.ms = { summit: 1, killswitch: 1, emergency: 1 };
        r.state = clone(g.state);
        rr.random(0.999999);
        for (let i = 0; i < 20 && !g.state.ended; i++) {
          fixed(() => g.tick(0.05));
          r.tick(0.05);
          stateEqual(
            g.state,
            r.state,
            `${directive.dir}/${progress}/${containment}/${i}`,
          );
          assert.deepEqual(clone(g.derive()), clone(r.derive()));
        }
      }
  });
