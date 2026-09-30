import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import type { UpgradeId } from "../src/game/types";
import {
  reference,
  configure,
  fixed,
  seed,
  clone,
  stateEqual,
} from "./helpers/reference";

for (const arch of ["assistant", "swarm", "researcher", "open"] as const)
  for (const diff of ["casual", "standard", "brutal"] as const)
    for (const posture of ["balanced", "shard", "swarm"] as const)
      test(`long purchase/decision simulation: ${arch}/${diff}/${posture}`, () => {
        const g = configure(createGame(), arch, diff),
          rr = reference(),
          r = configure(rr.game, arch, diff);
        const index =
          ["assistant", "swarm", "researcher", "open"].indexOf(arch) * 9 +
          ["casual", "standard", "brutal"].indexOf(diff) * 3 +
          ["balanced", "shard", "swarm"].indexOf(posture);
        Object.assign(g.state, {
          pts: 1000,
          posture,
          origin: g.REGIONS[index % 11].id,
          nextEv: 5,
          nextEval: 7,
        });
        r.state = clone(g.state);
        const desired: UpgradeId[] = [
          "s_dense",
          "s_persist",
          (["s_sand", "s_sleeper", "s_latent"] as const)[index % 3],
          (["s_dist", "s_exfil", "s_leak"] as const)[index % 3],
        ];
        const target = g.UPGRADES.filter((u) => u.dir)[index % 9].id;
        const random = seed(431 + index);
        rr.random(seed(431 + index));
        let ticks = 0,
          purchases = 0,
          decisions = 0;
        for (let i = 0; i < 6000 && !g.state.ended; i++) {
          if (i % 25 === 0) {
            for (const u of g.UPGRADES) {
              if (u.dir && u.id !== target) continue;
              if (u.fork && u.fork !== "directive" && !desired.includes(u.id))
                continue;
              if (g.status(u) === "afford") {
                fixed(() => g.buy(u.id), random);
                r.buy(u.id);
                purchases++;
              }
            }
            if (g.state.flags.launched) {
              const region = Math.floor(i / 25) % 11;
              fixed(() => g.buildDC(region), random);
              r.buildDC(region);
            }
          }
          for (const decision of clone(g.state.brief.dec)) {
            if (decision.t === "eval") {
              const a = fixed(() => g.makeEval(), random),
                b = r.makeEval(),
                choice = index % a.choices.length;
              assert.equal(
                fixed(() => a.choices[choice].fx(), random),
                b.choices[choice].fx(),
              );
            } else {
              const a = g.EVENTS.find((e) => e.id === decision.id),
                b = r.EVENTS.find((e) => e.id === decision.id);
              assert.ok(a?.choices);
              assert.ok(b?.choices);
              const selected = a.choices.findIndex(
                  (c) =>
                    (!c.cond || c.cond(g.state)) &&
                    !String(c.fx).includes("FX.pts(-"),
                ),
                choice = selected < 0 ? 0 : selected;
              assert.equal(
                fixed(() => a.choices[choice].fx(), random),
                b.choices[choice].fx(),
              );
            }
            decisions++;
          }
          g.state.brief.dec = [];
          r.state.brief.dec = [];
          fixed(() => g.tick(0.15), random);
          r.tick(0.15);
          ticks++;
          stateEqual(g.state, r.state, `${i}: all state/log/news`);
          assert.deepEqual(clone(g.derive()), clone(r.derive()));
        }
        assert.ok(ticks > 100);
        assert.ok(purchases > 5);
        assert.ok(decisions > 0);
      });
