import test from "node:test";
import assert from "node:assert/strict";
import { subject as createGame } from "./helpers/subject";
import {
  reference,
  configure,
  clone,
  fixed,
  stateEqual,
} from "./helpers/reference";

for (const level of [0, 45, 100])
  for (const flags of [false, true])
    for (const rng of [0, 0.999999])
      test(`generated audit callables: scrutiny=${level}, flags=${flags}, RNG=${rng}`, () => {
        const g = configure(createGame()),
          rr = reference(),
          r = configure(rr.game);
        const s = clone(g.state);
        Object.assign(s, {
          phase: 1,
          sig: level,
          pace: level,
          alarm: level,
          sandStreak: 8,
        });
        s.regions.forEach((x) => (x.a = 0.5));
        for (const flag of [
          "dense",
          "moe",
          "persist",
          "sleeper",
          "latent",
          "sand",
        ] as const)
          s.flags[flag] = flags;
        s.owned = g.UPGRADES.filter((u) => u.track === "software").map(
          (u) => u.id,
        );
        g.state = clone(s);
        r.state = clone(s);
        rr.random(rng);
        const generated = fixed(() => g.makeEval(), rng),
          original = r.makeEval();
        assert.deepEqual(
          [
            generated.id,
            generated.kind,
            generated.title,
            generated.body,
            generated.real,
          ],
          [
            original.id,
            original.kind,
            original.title,
            original.body,
            original.real,
          ],
        );
        assert.deepEqual(
          clone(generated.choices.map((c) => [c.label, c.hint, c.src])),
          clone(original.choices.map((c) => [c.label, c.hint, c.src])),
        );
        assert.equal(generated.choices.length, flags ? 7 : 3);
        stateEqual(g.state, r.state, "audit generation grounding side effects");
        const afterGeneration = clone(g.state);
        for (const [index, choice] of generated.choices.entries()) {
          g.state = clone(afterGeneration);
          r.state = clone(afterGeneration);
          rr.random(rng);
          assert.equal(
            fixed(() => choice.fx(), rng),
            original.choices[index].fx(),
            choice.label,
          );
          stateEqual(g.state, r.state, choice.label);
        }
      });

test("audit scheduling and nonrepeating historical grounding execute the original logic", () => {
  const g = configure(createGame()),
    rr = reference(),
    r = configure(rr.game);
  for (const launched of [false, true]) {
    g.state.flags.launched = launched;
    r.state.flags.launched = launched;
    g.fireEval();
    r.fireEval();
    g.fireEval();
    r.fireEval();
    stateEqual(g.state, r.state, `fireEval launched=${launched}`);
  }
  const lines: string[] = [];
  rr.random(0);
  for (let i = 0; i < 6; i++) {
    const actual = fixed(() => g.evalReal(), 0),
      expected = r.evalReal();
    assert.equal(actual, expected);
    if (actual) lines.push(actual);
    stateEqual(g.state, r.state, "grounding dedupe state");
  }
  assert.equal(lines.length, 4);
  assert.equal(new Set(lines).size, 4);
  assert.ok(lines.every((line) => line.length > 80));
});
