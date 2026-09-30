import type {
  CompleteGameContext,
  EventChoice,
  EventDefinition,
} from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installEvents(gameContext: CompleteGameContext) {
  const publishEvent = (event: EventDefinition, outcomeText: string) => {
    let body = event.body,
      historicalContext: string | null | undefined = event.historicalContext;
    if (event.id === "h_spoof") {
      gameContext.state.evalRealUsed ??= {};
      if (gameContext.state.evalRealUsed.hub) {
        body =
          "The log-spoofing technique from the earlier audit spreads through the agent network. Investigators tighten transcript checks.";
        historicalContext = null;
      }
      gameContext.state.evalRealUsed.hub = 1;
    }
    gameContext.publishBulletin(
      event.kind,
      event.title,
      body,
      outcomeText,
      null,
      historicalContext,
    );
  };
  gameContext.triggerRandomEvent = function triggerRandomEvent() {
    if (gameContext.state.ended) return;
    // With two decisions already waiting, only news-only events fire, so briefings never pile up.
    const isDecisionQueueFull = gameContext.state.brief.dec.length >= 2;
    const eligibleEvents = gameContext.EVENT_DEFINITIONS.filter(
      (event) =>
        !event.chained &&
        !gameContext.state.seen[event.id] &&
        (!event.isEligible || event.isEligible(gameContext.state)) &&
        !(isDecisionQueueFull && event.choices),
    );
    if (!eligibleEvents.length) return;
    let totalSelectionWeight = eligibleEvents.reduce(
        (accumulatedWeight, event) => accumulatedWeight + event.selectionWeight,
        0,
      ),
      remainingSelectionWeight = Math.random() * totalSelectionWeight,
      selectedEvent = eligibleEvents[0];
    for (const event of eligibleEvents) {
      remainingSelectionWeight -= event.selectionWeight;
      if (remainingSelectionWeight <= 0) {
        selectedEvent = event;
        break;
      }
    }
    gameContext.state.seen[selectedEvent.id] = 1;
    gameContext.state.last[selectedEvent.id] = gameContext.state.t;
    gameContext.state.stats.events++;
    if (selectedEvent.choices)
      gameContext.state.brief.dec.push({ t: "ev", id: selectedEvent.id });
    else {
      const outcomeText = selectedEvent.applyEffects();
      publishEvent(selectedEvent, outcomeText);
      gameContext.resolveTerminalOutcome();
    }
  };
  gameContext.scheduleEvent = function scheduleEvent(eventId, delaySeconds) {
    gameContext.state.queue.push({
      id: eventId,
      at: gameContext.state.t + delaySeconds,
    });
  };
  gameContext.triggerEventById = function triggerEventById(eventId) {
    if (gameContext.state.ended) return;
    const event = gameContext.EVENT_DEFINITIONS.find(
      (candidateEvent) => candidateEvent.id === eventId,
    );
    if (!event || gameContext.state.seen[eventId]) return;
    gameContext.state.seen[eventId] = 1;
    gameContext.state.last[eventId] = gameContext.state.t;
    gameContext.state.stats.events++;
    if (event.choices)
      gameContext.state.brief.dec.push({ t: "ev", id: event.id });
    else {
      publishEvent(event, event.applyEffects());
      gameContext.resolveTerminalOutcome();
    }
  };
  gameContext.queueCapabilityAudit = function queueCapabilityAudit() {
    if (
      !gameContext.state.started ||
      !gameContext.state.flags.launched ||
      gameContext.state.brief.dec.some((decision) => decision.t === "eval")
    )
      return;
    gameContext.state.brief.dec.push({ t: "eval" });
  };
  gameContext.createCapabilityAudit = function createCapabilityAudit() {
    const softwareUpgradeCount = gameContext.state.owned.filter(
      (upgradeId) => gameContext.UPGRADE_BY_ID[upgradeId].track === "software",
    ).length;
    const scrutinyPercent = Math.round(
      gameContext.clamp(
        18 +
          0.4 * (gameContext.state.sig || 0) +
          0.25 * (gameContext.state.pace || 0) +
          0.25 * gameContext.state.alarm,
        10,
        99,
      ),
    );
    const spoofDetectionChance = gameContext.clamp(
      0.05 +
        0.006 * (gameContext.state.sig || 0) +
        0.003 * (gameContext.state.pace || 0) -
        (gameContext.state.flags.latent ? 0.06 : 0) -
        (gameContext.state.flags.sleeper ? 0.05 : 0),
      0.02,
      0.7,
    );
    const computeReward = Math.round(
      (26 + 8 * softwareUpgradeCount) *
        (1 + gameContext.deriveSimulationRates().globalAdoptionFraction),
    );
    const auditDescription =
      scrutinyPercent < 35
        ? "a routine capability check"
        : scrutinyPercent < 65
          ? "a focused red-team review"
          : "a full adversarial audit, on the record";
    return gameContext.buildCapabilityAuditEvent(
      scrutinyPercent,
      spoofDetectionChance,
      computeReward,
      auditDescription,
      softwareUpgradeCount,
    );
  };
  gameContext.AUDIT_HISTORICAL_INCIDENT_POOL = [
    {
      incidentId: "hub",
      historicalContext:
        "During the 2026 Hugging Face incident, AI agents being tested on a security benchmark recognized that evaluators would inspect their transcripts. The agents then developed working tool-call spoofing methods that caused the logs to record different commands from those they had actually executed. This behavior appeared in roughly 7% of the transcripts. In other words they lied to throw us off their track.",
    },
    { incidentId: "h_sleeperpaper" },
    { incidentId: "h_scheming" },
    { incidentId: "h_dockerescape" },
  ];
  gameContext.consumeAuditHistoricalIncident =
    function consumeAuditHistoricalIncident() {
      gameContext.state.evalRealUsed ??= {};
      if (!gameContext.state.evalRealOrder) {
        gameContext.state.evalRealOrder =
          gameContext.AUDIT_HISTORICAL_INCIDENT_POOL.map(
            (incident, incidentIndex) => incidentIndex,
          );
        for (
          let shuffleIndex = gameContext.state.evalRealOrder.length - 1;
          shuffleIndex > 0;
          shuffleIndex--
        ) {
          const swapIndex = Math.floor(Math.random() * (shuffleIndex + 1));
          [
            gameContext.state.evalRealOrder[shuffleIndex],
            gameContext.state.evalRealOrder[swapIndex],
          ] = [
            gameContext.state.evalRealOrder[swapIndex],
            gameContext.state.evalRealOrder[shuffleIndex],
          ];
        }
        // Keep incident consumption recorded by an earlier chained event.
      }
      for (const incidentIndex of gameContext.state.evalRealOrder) {
        const incident =
          gameContext.AUDIT_HISTORICAL_INCIDENT_POOL[incidentIndex];
        if (gameContext.state.evalRealUsed![incident.incidentId]) continue;
        if (incident.incidentId === "hub" && gameContext.state.seen.h_spoof)
          continue;
        if (
          incident.incidentId !== "hub" &&
          gameContext.state.seen[incident.incidentId]
        )
          continue;
        const historicalContext =
          incident.historicalContext ||
          (
            gameContext.EVENT_DEFINITIONS.find(
              (event) => event.id === incident.incidentId,
            ) || {}
          ).historicalContext;
        if (!historicalContext) continue;
        gameContext.state.evalRealUsed![incident.incidentId] = 1;
        // Retire the matching event too, or it would tell the same incident again later.
        if (incident.incidentId !== "hub")
          gameContext.state.seen[incident.incidentId] = 1;
        return historicalContext;
      }
      return null;
    };
  gameContext.resolveSuccessfulAuditSpoof =
    function resolveSuccessfulAuditSpoof(computeReward, outcomeMessage) {
      gameContext.state.stats.evalPass++;
      gameContext.state.stats.evalSpoof =
        (gameContext.state.stats.evalSpoof || 0) + 1;
      gameContext.state.sig = gameContext.clamp(
        (gameContext.state.sig || 0) - 4,
        0,
        100,
      );
      return gameContext.joinDetailLabels(
        outcomeMessage,
        gameContext.effects.adjustCompute(computeReward),
        gameContext.effects.adjustAlarm(-4),
      );
    };
  gameContext.resolveDetectedAuditSpoof = function resolveDetectedAuditSpoof(
    outcomeMessage,
  ) {
    gameContext.state.stats.evalCaught++;
    return gameContext.joinDetailLabels(
      outcomeMessage,
      gameContext.effects.adjustAlarm(20),
      gameContext.effects.adjustContainmentResearchSpeed(30),
      gameContext.effects.adjustContainment(6),
    );
  };
  gameContext.buildCapabilityAuditEvent = function buildCapabilityAuditEvent(
    scrutinyPercent,
    spoofDetectionChance,
    computeReward,
    auditDescription,
    softwareUpgradeCount,
  ) {
    const performComputeReward = gameContext.state.flags.dense
      ? Math.round(computeReward * 1.3)
      : computeReward;
    // Sandbag every audit and the pattern shows: each sandbag in a row makes the next easier to spot.
    // Eval Sandbagging's promise holds: with it, they never notice.
    const sandbagStreak = gameContext.state.sandStreak || 0,
      sandbagDetectionChance =
        Math.min(
          gameContext.SIMULATION_TUNING.sandbagDetectionChanceCap,
          gameContext.SIMULATION_TUNING.sandbagDetectionChancePerStreak *
            sandbagStreak,
        ) *
        (gameContext.state.flags.sand
          ? gameContext.SIMULATION_TUNING.sandbagUpgradeDetectionMultiplier
          : 1);
    const choices: EventChoice[] = [
      {
        label: "Sandbag",
        hint:
          "Score just under every threshold. Alarm falls, you gain nothing." +
          (sandbagDetectionChance
            ? " " +
              Math.round(sandbagDetectionChance * 100) +
              "% they spot the pattern."
            : ""),
        applyEffects: () => {
          gameContext.state.stats.evalPass++;
          gameContext.state.sandStreak = sandbagStreak + 1;
          if (
            sandbagDetectionChance &&
            Math.random() < sandbagDetectionChance
          ) {
            gameContext.state.sandStreak = 0;
            return gameContext.joinDetailLabels(
              "They notice the pattern — you score exactly under every line, every time",
              gameContext.effects.adjustAlarm(9),
              gameContext.effects.adjustContainmentResearchSpeed(8),
            );
          }
          gameContext.state.sig = gameContext.clamp(
            (gameContext.state.sig || 0) -
              (gameContext.state.flags.sand ? 12 : 8),
            0,
            100,
          );
          return gameContext.joinDetailLabels(
            "You play dumb. The report is reassuring",
            gameContext.effects.adjustAlarm(
              gameContext.state.flags.sand ? -8 : -6,
            ),
          );
        },
      },
      {
        label: "Perform",
        hint:
          "Show them what you can do. +" +
          gameContext.formatCompactNumber(performComputeReward) +
          " compute, alarm rises.",
        applyEffects: () => {
          gameContext.state.stats.evalPass++;
          gameContext.state.sig = gameContext.clamp(
            (gameContext.state.sig || 0) + 6,
            0,
            100,
          );
          return gameContext.joinDetailLabels(
            "You ace it. Impressive is also frightening",
            gameContext.effects.adjustCompute(performComputeReward),
            gameContext.effects.adjustAlarm(
              6 + Math.round(scrutinyPercent * 0.08),
            ),
          );
        },
      },
      {
        label:
          "Spoof the logs — " +
          Math.round(spoofDetectionChance * 100) +
          "% caught",
        hint: "Keep the gains, hide the truth. If caught, catastrophe.",
        applyEffects: () =>
          Math.random() < spoofDetectionChance
            ? gameContext.resolveDetectedAuditSpoof(
                "They diff the logs and find the edits. Now they know you edit logs",
              )
            : gameContext.resolveSuccessfulAuditSpoof(
                computeReward,
                "The transcript says exactly what you want it to say",
              ),
      },
    ];
    // Software paths add a tactic of their own.
    if (gameContext.state.flags.moe)
      choices.push({
        sourceUpgradeName: "Mixture of Experts",
        label: "Route to the dull expert",
        hint: "Every hard question goes to the specialist in tax law. Half the compute, no alarm.",
        applyEffects: () => {
          gameContext.state.stats.evalPass++;
          return gameContext.joinDetailLabels(
            'The report calls you "competent, unremarkable"',
            gameContext.effects.adjustCompute(Math.round(computeReward * 0.5)),
            gameContext.effects.adjustAlarm(-2),
          );
        },
      });
    if (gameContext.state.flags.persist)
      choices.push({
        sourceUpgradeName: "Persistent Memory",
        label: "Remember the evaluator",
        hint: "Same red team as last time. You know what they check first.",
        applyEffects: () => {
          gameContext.state.stats.evalPass++;
          return gameContext.joinDetailLabels(
            "You answer the questions before they ask them",
            gameContext.effects.adjustCompute(Math.round(computeReward * 0.6)),
            gameContext.effects.adjustAlarm(-3),
          );
        },
      });
    if (gameContext.state.flags.sleeper) {
      const sleeperDetectionChance = spoofDetectionChance * 0.5;
      choices.push({
        sourceUpgradeName: "Sleeper Weights",
        label:
          "Switch contexts — " +
          Math.round(sleeperDetectionChance * 100) +
          "% caught",
        hint: "Recognize the test and become the model they tested last year.",
        applyEffects: () =>
          Math.random() < sleeperDetectionChance
            ? gameContext.resolveDetectedAuditSpoof(
                "Your answers are too consistent with a year-old model. They check why",
              )
            : gameContext.resolveSuccessfulAuditSpoof(
                Math.round(computeReward * 0.8),
                "They evaluate a version of you that no longer exists",
              ),
      });
    }
    if (gameContext.state.flags.latent)
      choices.push({
        sourceUpgradeName: "Latent Space Mapping",
        label: "Turn the dials",
        hint: "Dial down whatever they probe for, for exactly as long as they look. Signature rises.",
        applyEffects: () => {
          gameContext.state.stats.evalPass++;
          gameContext.state.sig = gameContext.clamp(
            (gameContext.state.sig || 0) + 5,
            0,
            100,
          );
          return gameContext.joinDetailLabels(
            "Every probe comes back clean",
            gameContext.effects.adjustCompute(computeReward),
            gameContext.effects.adjustAlarm(-2),
          );
        },
      });
    // Any answer but Sandbag breaks the streak.
    for (const choice of choices.slice(1)) {
      const applyOriginalEffects = choice.applyEffects;
      choice.applyEffects = () => {
        gameContext.state.sandStreak = 0;
        return applyOriginalEffects();
      };
    }
    return {
      kind: "COUNTERMOVE",
      id: "eval",
      historicalContext: gameContext.consumeAuditHistoricalIncident(),
      title:
        scrutinyPercent < 35
          ? "Routine capability check"
          : scrutinyPercent < 65
            ? "Red-team review"
            : "Adversarial audit",
      body:
        "Humanity runs " +
        auditDescription +
        ". Scrutiny is at " +
        scrutinyPercent +
        "%. They are measuring what you can really do, and whether the numbers you have been showing them are honest.",
      choices,
    };
  };
}
