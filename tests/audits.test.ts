import test from "node:test";
import assert from "node:assert/strict";
import { createParityTestGame as createGame } from "./helpers/subject";
import {
  createHistoricalReference,
  configureStartedRun,
  cloneSerializableValue,
  withControlledRandom,
  assertGameStatesEqual,
} from "./helpers/reference";

for (const scrutinyLevel of [0, 45, 100])
  for (const enableAuditFlags of [false, true])
    for (const randomValue of [0, 0.999999])
      test(`generated audit callables: scrutiny=${scrutinyLevel}, flags=${enableAuditFlags}, RNG=${randomValue}`, () => {
        const migratedGame = configureStartedRun(createGame()),
          historicalReference = createHistoricalReference(),
          historicalGame = configureStartedRun(historicalReference.game);
        const auditFixtureState = cloneSerializableValue(migratedGame.state);
        Object.assign(auditFixtureState, {
          phase: 1,
          sig: scrutinyLevel,
          pace: scrutinyLevel,
          alarm: scrutinyLevel,
          sandStreak: 8,
        });
        auditFixtureState.regions.forEach(
          (regionState) => (regionState.a = 0.5),
        );
        for (const auditFlagId of [
          "dense",
          "moe",
          "persist",
          "sleeper",
          "latent",
          "sand",
        ] as const)
          auditFixtureState.flags[auditFlagId] = enableAuditFlags;
        auditFixtureState.owned = migratedGame.UPGRADE_DEFINITIONS.filter(
          (softwareUpgrade) => softwareUpgrade.track === "software",
        ).map((softwareUpgrade) => softwareUpgrade.id);
        migratedGame.state = cloneSerializableValue(auditFixtureState);
        historicalGame.state = cloneSerializableValue(auditFixtureState);
        historicalReference.random(randomValue);
        const generatedAudit = withControlledRandom(
            () => migratedGame.createCapabilityAudit(),
            randomValue,
          ),
          historicalAudit = historicalGame.createCapabilityAudit();
        assert.deepEqual(
          [
            generatedAudit.id,
            generatedAudit.kind,
            generatedAudit.title,
            generatedAudit.body,
            generatedAudit.historicalContext,
          ],
          [
            historicalAudit.id,
            historicalAudit.kind,
            historicalAudit.title,
            historicalAudit.body,
            historicalAudit.historicalContext,
          ],
        );
        assert.deepEqual(
          cloneSerializableValue(
            generatedAudit.choices.map((auditChoice) => [
              auditChoice.label,
              auditChoice.hint,
              auditChoice.sourceUpgradeName,
            ]),
          ),
          cloneSerializableValue(
            historicalAudit.choices.map((auditChoice) => [
              auditChoice.label,
              auditChoice.hint,
              auditChoice.sourceUpgradeName,
            ]),
          ),
        );
        assert.equal(generatedAudit.choices.length, enableAuditFlags ? 7 : 3);
        assertGameStatesEqual(
          migratedGame.state,
          historicalGame.state,
          "audit generation grounding side effects",
        );
        const postGenerationState = cloneSerializableValue(migratedGame.state);
        for (const [
          choiceIndex,
          auditChoice,
        ] of generatedAudit.choices.entries()) {
          migratedGame.state = cloneSerializableValue(postGenerationState);
          historicalGame.state = cloneSerializableValue(postGenerationState);
          historicalReference.random(randomValue);
          assert.equal(
            withControlledRandom(() => auditChoice.applyEffects(), randomValue),
            historicalAudit.choices[choiceIndex].applyEffects(),
            auditChoice.label,
          );
          assertGameStatesEqual(
            migratedGame.state,
            historicalGame.state,
            auditChoice.label,
          );
        }
      });

test("audit scheduling and nonrepeating historical grounding execute the original logic", () => {
  const migratedGame = configureStartedRun(createGame()),
    historicalReference = createHistoricalReference(),
    historicalGame = configureStartedRun(historicalReference.game);
  for (const isLaunched of [false, true]) {
    migratedGame.state.flags.launched = isLaunched;
    historicalGame.state.flags.launched = isLaunched;
    migratedGame.queueCapabilityAudit();
    historicalGame.queueCapabilityAudit();
    migratedGame.queueCapabilityAudit();
    historicalGame.queueCapabilityAudit();
    assertGameStatesEqual(
      migratedGame.state,
      historicalGame.state,
      `fireEval launched=${isLaunched}`,
    );
  }
  const historicalGroundingTexts: string[] = [];
  historicalReference.random(0);
  for (
    let groundingAttemptIndex = 0;
    groundingAttemptIndex < 6;
    groundingAttemptIndex++
  ) {
    const actualGroundingText = withControlledRandom(
        () => migratedGame.consumeAuditHistoricalIncident(),
        0,
      ),
      historicalGroundingText = historicalGame.consumeAuditHistoricalIncident();
    assert.equal(actualGroundingText, historicalGroundingText);
    if (actualGroundingText) historicalGroundingTexts.push(actualGroundingText);
    assertGameStatesEqual(
      migratedGame.state,
      historicalGame.state,
      "grounding dedupe state",
    );
  }
  assert.equal(historicalGroundingTexts.length, 4);
  assert.equal(new Set(historicalGroundingTexts).size, 4);
  assert.ok(
    historicalGroundingTexts.every(
      (groundingText) => groundingText.length > 80,
    ),
  );
});
