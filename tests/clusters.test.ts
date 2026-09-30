import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import type { CompleteGameContext } from "../src/game/types";
import type { installEconomy } from "../src/game/economy";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  reference,
  configure,
  clone,
  fixed,
  stateEqual,
} from "./helpers/reference";

type StrikeCase = {
  name: string;
  flags: readonly ("distributed" | "small" | "airdeny" | "foundry")[];
  samples: readonly number[];
  outcome: "evaded" | "intercepted" | "lost";
};

function staged(samples: readonly number[]) {
  let index = 0;
  return {
    next: () => {
      assert.ok(index < samples.length, "unexpected extra RNG draw");
      return samples[index++];
    },
    complete: () =>
      assert.equal(index, samples.length, "defense RNG was not reached"),
  };
}

const stagedCases = [
  {
    name: "distributed evades below .55",
    flags: ["distributed"],
    samples: [0, 0, 0.549999],
    outcome: "evaded",
  },
  {
    name: "distributed fails at .55",
    flags: ["distributed"],
    samples: [0, 0, 0.55],
    outcome: "lost",
  },
  {
    name: "small evades below .2",
    flags: ["small"],
    samples: [0, 0, 0.199999],
    outcome: "evaded",
  },
  {
    name: "small fails at .2",
    flags: ["small"],
    samples: [0, 0, 0.2],
    outcome: "lost",
  },
  {
    name: "air denial intercepts below .5",
    flags: ["airdeny"],
    samples: [0, 0, 0.499999],
    outcome: "intercepted",
  },
  {
    name: "air denial fails at .5",
    flags: ["airdeny"],
    samples: [0, 0, 0.5],
    outcome: "lost",
  },
  {
    name: "air denial fails above .5",
    flags: ["airdeny"],
    samples: [0, 0, 0.6],
    outcome: "lost",
  },
  {
    name: "distributed short-circuits later defenses",
    flags: ["distributed", "small", "airdeny"],
    samples: [0, 0, 0],
    outcome: "evaded",
  },
  {
    name: "small short-circuits air denial",
    flags: ["distributed", "small", "airdeny"],
    samples: [0, 0, 0.6, 0],
    outcome: "evaded",
  },
  {
    name: "air denial intercepts after both evasions fail",
    flags: ["distributed", "small", "airdeny"],
    samples: [0, 0, 0.6, 0.3, 0.4],
    outcome: "intercepted",
  },
  {
    name: "all defenses fail and the foundry schedules recovery",
    flags: ["distributed", "small", "airdeny", "foundry"],
    samples: [0, 0, 0.6, 0.3, 0.6],
    outcome: "lost",
  },
] satisfies readonly StrikeCase[];

function compareStagedStrike(
  scenario: StrikeCase,
  g = configure(createGame()),
): void {
  const rr = reference(),
    r = configure(rr.game);
  Object.assign(g.state, { phase: 1, alarm: 80, t: 500 });
  g.state.regions[0].dc = true;
  for (const flag of scenario.flags) g.state.flags[flag] = true;
  r.state = clone(g.state);
  g.ui.dirty = r.ui.dirty = false;
  const actualRng = staged(scenario.samples),
    historicalRng = staged(scenario.samples);
  rr.random(historicalRng.next);
  fixed(() => g.checkStrikes(), actualRng.next);
  r.checkStrikes();
  actualRng.complete();
  historicalRng.complete();
  stateEqual(g.state, r.state, `staged defense: ${scenario.name}`);
  assert.equal(g.state.strikeT, 518);
  assert.equal(g.state.regions[0].struck, scenario.outcome === "lost");
  assert.equal(g.state.stats.dcLost, scenario.outcome === "lost" ? 1 : 0);
  assert.equal(
    g.state.stats.intercepts,
    scenario.outcome === "intercepted" ? 1 : 0,
  );
  assert.equal(
    g.state.regions[0].rebuildAt,
    scenario.outcome === "lost" && scenario.flags.includes("foundry") ? 545 : 0,
  );
  assert.equal(g.state.log.length, scenario.outcome === "evaded" ? 0 : 1);
  assert.equal(
    g.state.brief.news.length,
    scenario.outcome === "evaded" ? 0 : 1,
  );
  assert.equal(g.state.brief.urgent, scenario.outcome === "lost");
  assert.equal(g.ui.dirty, r.ui.dirty);
  for (const time of [544.999, 545]) {
    g.state.t = r.state.t = time;
    g.checkRebuilds();
    r.checkRebuilds();
    stateEqual(g.state, r.state, `staged recovery: ${scenario.name}/${time}`);
    const rebuilt =
      scenario.outcome === "lost" &&
      scenario.flags.includes("foundry") &&
      time >= 545;
    assert.equal(g.state.stats.dcRebuilt, rebuilt ? 1 : 0);
    assert.equal(
      g.state.regions[0].struck,
      scenario.outcome === "lost" && !rebuilt,
    );
  }
}

async function economyMutant(
  before: string,
  after: string,
): Promise<typeof installEconomy> {
  const source = readFileSync(
    new URL("../src/game/economy.ts", import.meta.url),
    "utf8",
  );
  assert.equal(
    source.split(before).length,
    2,
    "unique actual defense mutation target",
  );
  const code = ts.transpileModule(source.replace(before, after), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  const mutant = (await import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  )) as { installEconomy: typeof installEconomy };
  return mutant.installEconomy;
}

for (const [flag, threshold, scenarioName] of [
  ["distributed", "0.55", "distributed fails at .55"],
  ["small", "0.2", "small fails at .2"],
  ["airdeny", "0.5", "air denial fails above .5"],
] as const)
  test(`staged cluster suite rejects actual ${flag} probability ${threshold}->1 mutation`, async () => {
    const install = await economyMutant(
      `ctx.state.flags.${flag} && Math.random() < ${threshold}`,
      `ctx.state.flags.${flag} && Math.random() < 1`,
    );
    const game = configure(createGame());
    install(game);
    const scenario = stagedCases.find((entry) => entry.name === scenarioName);
    assert.ok(scenario);
    assert.throws(() => compareStagedStrike(scenario, game), {
      code: "ERR_ASSERTION",
      message: new RegExp(
        `^staged defense: ${scenario.name.replaceAll(".", "\\.")}`,
      ),
    });
  });

for (const scenario of stagedCases)
  test(`staged cluster defense: ${scenario.name}`, () =>
    compareStagedStrike(scenario));

function compareClusterAction(
  setup: (game: CompleteGameContext) => void,
  action: (
    game: Pick<
      CompleteGameContext,
      "state" | "checkStrikes" | "checkRebuilds" | "REGIONS" | "ui"
    >,
  ) => void,
  samples: readonly number[] = [],
): CompleteGameContext {
  const game = configure(createGame()),
    rr = reference(),
    old = configure(rr.game);
  setup(game);
  old.state = clone(game.state);
  game.ui.dirty = old.ui.dirty = false;
  const actualRng = staged(samples),
    historicalRng = staged(samples);
  rr.random(historicalRng.next);
  fixed(() => action(game), actualRng.next);
  action(old);
  actualRng.complete();
  historicalRng.complete();
  stateEqual(
    game.state,
    old.state,
    "cluster gate/rebuild preserves full state, log and news",
  );
  assert.equal(game.ui.dirty, old.ui.dirty);
  return game;
}

for (const gate of [
  "sandbox",
  "cooldown",
  "no campus",
  "all struck",
  "chance miss",
] as const)
  test(`cluster strike gate: ${gate}`, () => {
    const game = compareClusterAction(
      (g) => {
        Object.assign(g.state, { phase: 1, t: 500, alarm: 80 });
        g.state.regions[0].dc = true;
        if (gate === "sandbox") g.state.phase = 0;
        if (gate === "cooldown") g.state.strikeT = 501;
        if (gate === "no campus") g.state.regions[0].dc = false;
        if (gate === "all struck") g.state.regions[0].struck = true;
      },
      (g) => g.checkStrikes(),
      gate === "chance miss" ? [0.02 + 0.02 * (80 / 100)] : [],
    );
    assert.equal(game.state.stats.dcLost, 0);
    assert.equal(game.state.stats.intercepts, 0);
    assert.equal(game.state.log.length, 0);
  });

test("cluster strike chooses only online targets and emergency raises the attempt chance", () => {
  const game = compareClusterAction(
    (g) => {
      Object.assign(g.state, { phase: 1, t: 500, alarm: 80 });
      g.state.ms.emergency = 1;
      g.state.regions[0].dc = true;
      g.state.regions[0].struck = true;
      g.state.regions[1].dc = g.state.regions[2].dc = true;
    },
    (g) => g.checkStrikes(),
    [0.05, 0.999999],
  );
  assert.equal(game.state.regions[1].struck, false);
  assert.equal(game.state.regions[2].struck, true);
  assert.equal(game.state.stats.dcLost, 1);
});

for (const foundry of [false, true])
  test(`foundry recovery handles old craters, intact and absent campuses: ${foundry}`, () => {
    const game = compareClusterAction(
      (g) => {
        g.state.t = 500;
        g.state.flags.foundry = foundry;
        Object.assign(g.state.regions[0], {
          dc: true,
          struck: true,
          rebuildAt: 0,
        });
        Object.assign(g.state.regions[1], {
          dc: true,
          struck: true,
          rebuildAt: 500,
        });
        Object.assign(g.state.regions[2], {
          dc: true,
          struck: false,
          rebuildAt: 400,
        });
        Object.assign(g.state.regions[3], {
          dc: false,
          struck: true,
          rebuildAt: 400,
        });
      },
      (g) => g.checkRebuilds(),
    );
    assert.equal(game.state.regions[0].rebuildAt, foundry ? 545 : 0);
    assert.equal(game.state.regions[1].struck, !foundry);
    assert.equal(game.state.regions[2].rebuildAt, 400);
    assert.equal(game.state.regions[3].struck, true);
    assert.equal(game.state.stats.dcRebuilt, foundry ? 1 : 0);
    assert.equal(game.state.log.length, foundry ? 1 : 0);
    assert.equal(game.state.brief.news.length, foundry ? 1 : 0);
  });

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
