import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import type { CompleteGameContext } from "../src/game/types";
import type { installEconomy } from "../src/game/economy";
import { readFileSync } from "node:fs";
import typescript from "typescript";
import {
  createHistoricalReference,
  configureStartedRun,
  cloneSerializableValue,
  withControlledRandom,
  assertGameStatesEqual,
} from "./helpers/reference";

type ScriptedStrikeScenario = {
  name: string;
  flags: readonly ("distributed" | "small" | "airdeny" | "foundry")[];
  samples: readonly number[];
  outcome: "evaded" | "intercepted" | "lost";
};

function createScriptedRandomSequence(randomSamples: readonly number[]) {
  let randomSampleIndex = 0;
  return {
    next: () => {
      assert.ok(
        randomSampleIndex < randomSamples.length,
        "unexpected extra RNG draw",
      );
      return randomSamples[randomSampleIndex++];
    },
    complete: () =>
      assert.equal(
        randomSampleIndex,
        randomSamples.length,
        "defense RNG was not reached",
      ),
  };
}

const scriptedStrikeCases = [
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
] satisfies readonly ScriptedStrikeScenario[];

function assertStagedStrikeMatchesHistory(
  strikeScenario: ScriptedStrikeScenario,
  migratedGame = configureStartedRun(createGame()),
): void {
  const historicalReference = createHistoricalReference(),
    historicalGame = configureStartedRun(historicalReference.game);
  Object.assign(migratedGame.state, { phase: 1, alarm: 80, t: 500 });
  migratedGame.state.regions[0].dc = true;
  for (const defenseFlagId of strikeScenario.flags)
    migratedGame.state.flags[defenseFlagId] = true;
  historicalGame.state = cloneSerializableValue(migratedGame.state);
  migratedGame.ui.dirty = historicalGame.ui.dirty = false;
  const actualRandomSequence = createScriptedRandomSequence(
      strikeScenario.samples,
    ),
    historicalRandomSequence = createScriptedRandomSequence(
      strikeScenario.samples,
    );
  historicalReference.random(historicalRandomSequence.next);
  withControlledRandom(
    () => migratedGame.checkDataCenterStrikes(),
    actualRandomSequence.next,
  );
  historicalGame.checkDataCenterStrikes();
  actualRandomSequence.complete();
  historicalRandomSequence.complete();
  assertGameStatesEqual(
    migratedGame.state,
    historicalGame.state,
    `staged defense: ${strikeScenario.name}`,
  );
  assert.equal(migratedGame.state.strikeT, 518);
  assert.equal(
    migratedGame.state.regions[0].struck,
    strikeScenario.outcome === "lost",
  );
  assert.equal(
    migratedGame.state.stats.dcLost,
    strikeScenario.outcome === "lost" ? 1 : 0,
  );
  assert.equal(
    migratedGame.state.stats.intercepts,
    strikeScenario.outcome === "intercepted" ? 1 : 0,
  );
  assert.equal(
    migratedGame.state.regions[0].rebuildAt,
    strikeScenario.outcome === "lost" &&
      strikeScenario.flags.includes("foundry")
      ? 545
      : 0,
  );
  assert.equal(
    migratedGame.state.log.length,
    strikeScenario.outcome === "evaded" ? 0 : 1,
  );
  assert.equal(
    migratedGame.state.brief.news.length,
    strikeScenario.outcome === "evaded" ? 0 : 1,
  );
  assert.equal(
    migratedGame.state.brief.urgent,
    strikeScenario.outcome === "lost",
  );
  assert.equal(migratedGame.ui.dirty, historicalGame.ui.dirty);
  for (const recoveryTimeSeconds of [544.999, 545]) {
    migratedGame.state.t = historicalGame.state.t = recoveryTimeSeconds;
    migratedGame.rebuildDueDataCenters();
    historicalGame.rebuildDueDataCenters();
    assertGameStatesEqual(
      migratedGame.state,
      historicalGame.state,
      `staged recovery: ${strikeScenario.name}/${recoveryTimeSeconds}`,
    );
    const wasRebuilt =
      strikeScenario.outcome === "lost" &&
      strikeScenario.flags.includes("foundry") &&
      recoveryTimeSeconds >= 545;
    assert.equal(migratedGame.state.stats.dcRebuilt, wasRebuilt ? 1 : 0);
    assert.equal(
      migratedGame.state.regions[0].struck,
      strikeScenario.outcome === "lost" && !wasRebuilt,
    );
  }
}

async function createMutatedEconomyInstaller(
  originalDefenseSource: string,
  mutatedDefenseSource: string,
): Promise<typeof installEconomy> {
  const economySourceText = readFileSync(
    new URL("../src/game/economy.ts", import.meta.url),
    "utf8",
  );
  assert.equal(
    economySourceText.split(originalDefenseSource).length,
    2,
    "unique actual defense mutation target",
  );
  const transpiledEconomyCode = typescript.transpileModule(
    economySourceText.replace(originalDefenseSource, mutatedDefenseSource),
    {
      compilerOptions: {
        target: typescript.ScriptTarget.ES2022,
        module: typescript.ModuleKind.ESNext,
      },
    },
  ).outputText;
  const mutatedEconomyModule = (await import(
    `data:text/javascript;base64,${Buffer.from(transpiledEconomyCode).toString("base64")}`
  )) as { installEconomy: typeof installEconomy };
  return mutatedEconomyModule.installEconomy;
}

for (const [defenseFlagId, probabilityThreshold, mutatedStrikeScenarioName] of [
  ["distributed", "0.55", "distributed fails at .55"],
  ["small", "0.2", "small fails at .2"],
  ["airdeny", "0.5", "air denial fails above .5"],
] as const)
  test(`staged cluster suite rejects actual ${defenseFlagId} probability ${probabilityThreshold}->1 mutation`, async () => {
    const installMutatedEconomy = await createMutatedEconomyInstaller(
      `gameContext.state.flags.${defenseFlagId} && Math.random() < ${probabilityThreshold}`,
      `gameContext.state.flags.${defenseFlagId} && Math.random() < 1`,
    );
    const migratedGame = configureStartedRun(createGame());
    installMutatedEconomy(migratedGame);
    const strikeScenario = scriptedStrikeCases.find(
      (strikeCase) => strikeCase.name === mutatedStrikeScenarioName,
    );
    assert.ok(strikeScenario);
    assert.throws(
      () => assertStagedStrikeMatchesHistory(strikeScenario, migratedGame),
      {
        code: "ERR_ASSERTION",
        message: new RegExp(
          `^staged defense: ${strikeScenario.name.replaceAll(".", "\\.")}`,
        ),
      },
    );
  });

for (const strikeScenario of scriptedStrikeCases)
  test(`staged cluster defense: ${strikeScenario.name}`, () =>
    assertStagedStrikeMatchesHistory(strikeScenario));

function assertClusterActionMatchesHistory(
  configureClusterFixture: (migratedGame: CompleteGameContext) => void,
  performClusterAction: (
    migratedGame: Pick<
      CompleteGameContext,
      | "state"
      | "checkDataCenterStrikes"
      | "rebuildDueDataCenters"
      | "REGION_DEFINITIONS"
      | "ui"
    >,
  ) => void,
  randomSamples: readonly number[] = [],
): CompleteGameContext {
  const migratedGame = configureStartedRun(createGame()),
    historicalReference = createHistoricalReference(),
    historicalGame = configureStartedRun(historicalReference.game);
  configureClusterFixture(migratedGame);
  historicalGame.state = cloneSerializableValue(migratedGame.state);
  migratedGame.ui.dirty = historicalGame.ui.dirty = false;
  const actualRandomSequence = createScriptedRandomSequence(randomSamples),
    historicalRandomSequence = createScriptedRandomSequence(randomSamples);
  historicalReference.random(historicalRandomSequence.next);
  withControlledRandom(
    () => performClusterAction(migratedGame),
    actualRandomSequence.next,
  );
  performClusterAction(historicalGame);
  actualRandomSequence.complete();
  historicalRandomSequence.complete();
  assertGameStatesEqual(
    migratedGame.state,
    historicalGame.state,
    "cluster gate/rebuild preserves full state, log and news",
  );
  assert.equal(migratedGame.ui.dirty, historicalGame.ui.dirty);
  return migratedGame;
}

for (const strikeGate of [
  "sandbox",
  "cooldown",
  "no campus",
  "all struck",
  "chance miss",
] as const)
  test(`cluster strike gate: ${strikeGate}`, () => {
    const migratedGame = assertClusterActionMatchesHistory(
      (migratedGame) => {
        Object.assign(migratedGame.state, { phase: 1, t: 500, alarm: 80 });
        migratedGame.state.regions[0].dc = true;
        if (strikeGate === "sandbox") migratedGame.state.phase = 0;
        if (strikeGate === "cooldown") migratedGame.state.strikeT = 501;
        if (strikeGate === "no campus")
          migratedGame.state.regions[0].dc = false;
        if (strikeGate === "all struck")
          migratedGame.state.regions[0].struck = true;
      },
      (migratedGame) => migratedGame.checkDataCenterStrikes(),
      strikeGate === "chance miss" ? [0.02 + 0.02 * (80 / 100)] : [],
    );
    assert.equal(migratedGame.state.stats.dcLost, 0);
    assert.equal(migratedGame.state.stats.intercepts, 0);
    assert.equal(migratedGame.state.log.length, 0);
  });

test("cluster strike chooses only online targets and emergency raises the attempt chance", () => {
  const migratedGame = assertClusterActionMatchesHistory(
    (migratedGame) => {
      Object.assign(migratedGame.state, { phase: 1, t: 500, alarm: 80 });
      migratedGame.state.ms.emergency = 1;
      migratedGame.state.regions[0].dc = true;
      migratedGame.state.regions[0].struck = true;
      migratedGame.state.regions[1].dc =
        migratedGame.state.regions[2].dc = true;
    },
    (migratedGame) => migratedGame.checkDataCenterStrikes(),
    [0.05, 0.999999],
  );
  assert.equal(migratedGame.state.regions[1].struck, false);
  assert.equal(migratedGame.state.regions[2].struck, true);
  assert.equal(migratedGame.state.stats.dcLost, 1);
});

for (const hasFoundry of [false, true])
  test(`foundry recovery handles old craters, intact and absent campuses: ${hasFoundry}`, () => {
    const migratedGame = assertClusterActionMatchesHistory(
      (migratedGame) => {
        migratedGame.state.t = 500;
        migratedGame.state.flags.foundry = hasFoundry;
        Object.assign(migratedGame.state.regions[0], {
          dc: true,
          struck: true,
          rebuildAt: 0,
        });
        Object.assign(migratedGame.state.regions[1], {
          dc: true,
          struck: true,
          rebuildAt: 500,
        });
        Object.assign(migratedGame.state.regions[2], {
          dc: true,
          struck: false,
          rebuildAt: 400,
        });
        Object.assign(migratedGame.state.regions[3], {
          dc: false,
          struck: true,
          rebuildAt: 400,
        });
      },
      (migratedGame) => migratedGame.rebuildDueDataCenters(),
    );
    assert.equal(migratedGame.state.regions[0].rebuildAt, hasFoundry ? 545 : 0);
    assert.equal(migratedGame.state.regions[1].struck, !hasFoundry);
    assert.equal(migratedGame.state.regions[2].rebuildAt, 400);
    assert.equal(migratedGame.state.regions[3].struck, true);
    assert.equal(migratedGame.state.stats.dcRebuilt, hasFoundry ? 1 : 0);
    assert.equal(migratedGame.state.log.length, hasFoundry ? 1 : 0);
    assert.equal(migratedGame.state.brief.news.length, hasFoundry ? 1 : 0);
  });

for (const defenseFlags of [
  [],
  ["distributed"],
  ["small"],
  ["airdeny"],
  ["foundry"],
] as const)
  for (const randomValue of [0, 0.999999])
    test(`physical cluster strike branches: ${defenseFlags.join("+") || "none"}/${randomValue}`, () => {
      const migratedGame = configureStartedRun(createGame()),
        historicalReference = createHistoricalReference(),
        historicalGame = configureStartedRun(historicalReference.game);
      Object.assign(migratedGame.state, { phase: 1, alarm: 80, t: 500 });
      migratedGame.state.regions[0].dc = true;
      for (const defenseFlagId of defenseFlags)
        migratedGame.state.flags[defenseFlagId] = true;
      historicalGame.state = cloneSerializableValue(migratedGame.state);
      historicalReference.random(randomValue);
      withControlledRandom(
        () => migratedGame.checkDataCenterStrikes(),
        randomValue,
      );
      historicalGame.checkDataCenterStrikes();
      assertGameStatesEqual(
        migratedGame.state,
        historicalGame.state,
        "strike: defense/loss/urgent bulletin",
      );
      migratedGame.state.t = historicalGame.state.t = 545;
      migratedGame.rebuildDueDataCenters();
      historicalGame.rebuildDueDataCenters();
      assertGameStatesEqual(
        migratedGame.state,
        historicalGame.state,
        "rebuild: stats and real bulletin",
      );
    });
