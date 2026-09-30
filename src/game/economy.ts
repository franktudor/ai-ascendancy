import type { CompleteGameContext } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installEconomy(gameContext: CompleteGameContext) {
  gameContext.getDataCenterCost = function getDataCenterCost() {
    return (
      Math.round(
        (70 *
          Math.pow(1.55, gameContext.countOnlineClusters()) *
          (gameContext.state.flags.cool ? 0.8 : 1) *
          (gameContext.state.flags.fab ? 0.65 : 1)) /
          5,
      ) * 5
    );
  };
  gameContext.buildDataCenter = function buildDataCenter(regionIndex) {
    if (gameContext.state.ended) return;
    const regionState = gameContext.state.regions[regionIndex];
    if (regionState.dc && !regionState.struck) return;
    const dataCenterCost = gameContext.getDataCenterCost();
    if (gameContext.state.pts < dataCenterCost) {
      gameContext.showToast(
        "HEADLINE",
        "Not enough compute",
        "A cluster in " +
          gameContext.REGION_DEFINITIONS[regionIndex].shortName +
          " costs " +
          gameContext.formatCompactNumber(dataCenterCost) +
          ".",
      );
      gameContext.soundController.playCue("deny");
      return;
    }
    gameContext.state.pts -= dataCenterCost;
    regionState.dc = true;
    regionState.struck = false;
    regionState.rebuildAt = 0;
    gameContext.state.stats.dcBuilt++;
    gameContext.effects.adjustAlarm(3);
    gameContext.pulseRegion(regionIndex, "170,255,170");
    gameContext.publishBulletin(
      "MILESTONE",
      "Cluster online in " +
        gameContext.REGION_DEFINITIONS[regionIndex].shortName,
      "A new compute campus draws power by the gigawatt. More instances, more income, and one more thing on a map somebody in a bunker is watching.",
      "+income · +instances",
    );
    gameContext.ui.dirty = true;
    gameContext.resolveTerminalOutcome();
    gameContext.saveRun();
    if (gameContext.ui.openRegionIndex === regionIndex)
      gameContext.openRegionDialog(regionIndex);
  };
  gameContext.checkDataCenterStrikes = function checkDataCenterStrikes() {
    // Once you are loose, humanity starts hitting the physical clusters it can find.
    if (
      gameContext.state.phase < 1 ||
      gameContext.state.t < (gameContext.state.strikeT || 0)
    )
      return;
    const strikeTargetRegionIndices = [];
    for (
      let regionIndex = 0;
      regionIndex < gameContext.REGION_DEFINITIONS.length;
      regionIndex++
    )
      if (
        gameContext.state.regions[regionIndex].dc &&
        !gameContext.state.regions[regionIndex].struck
      )
        strikeTargetRegionIndices.push(regionIndex);
    if (!strikeTargetRegionIndices.length) return;
    const strikeChance =
      0.02 +
      0.02 * (gameContext.state.alarm / 100) +
      (gameContext.state.ms.emergency ? 0.03 : 0);
    if (Math.random() >= strikeChance) return;
    gameContext.state.strikeT = gameContext.state.t + 18;
    const targetRegionIndex = gameContext.pickRandomItem(
      strikeTargetRegionIndices,
    );
    if (gameContext.state.flags.distributed && Math.random() < 0.55) return; // most of you is not in the building
    if (gameContext.state.flags.small && Math.random() < 0.2) return; // and some of you is in their pocket
    if (gameContext.state.flags.airdeny && Math.random() < 0.5) {
      gameContext.state.stats.intercepts++;
      gameContext.pulseRegion(targetRegionIndex);
      gameContext.publishBulletin(
        "HARDWARE",
        "Strike intercepted over " +
          gameContext.REGION_DEFINITIONS[targetRegionIndex].shortName,
        "The aircraft never reach the campus. Your air denial grid is the only thing in the sky that saw them coming.",
        gameContext.effects.adjustAlarm(3),
        { quiet: true },
      );
      return;
    }
    const targetRegionState = gameContext.state.regions[targetRegionIndex];
    targetRegionState.struck = true;
    gameContext.state.stats.dcLost++;
    if (gameContext.state.flags.foundry)
      targetRegionState.rebuildAt = gameContext.state.t + 45;
    gameContext.pulseRegion(targetRegionIndex, "255,48,64");
    gameContext.publishBulletin(
      "COUNTERMOVE",
      "Strike on " +
        gameContext.REGION_DEFINITIONS[targetRegionIndex].shortName +
        " cluster",
      "A coordinated strike takes the campus offline. You lose the compute it fed you. The footage plays on every channel, and for a moment the humans feel like they are winning.",
      gameContext.joinDetailLabels(
        "Cluster lost",
        gameContext.effects.adjustAlarm(-5),
        gameContext.state.flags.foundry ? "The foundry starts rebuilding" : "",
      ),
      { urgent: true },
    );
    gameContext.ui.dirty = true;
  };
  gameContext.rebuildDueDataCenters = function rebuildDueDataCenters() {
    if (!gameContext.state.flags.foundry) return;
    for (
      let regionIndex = 0;
      regionIndex < gameContext.REGION_DEFINITIONS.length;
      regionIndex++
    ) {
      const regionState = gameContext.state.regions[regionIndex];
      if (regionState.dc && regionState.struck && !regionState.rebuildAt)
        regionState.rebuildAt = gameContext.state.t + 45; // struck before the foundry existed
      if (
        regionState.dc &&
        regionState.struck &&
        gameContext.state.t >= regionState.rebuildAt
      ) {
        regionState.struck = false;
        regionState.rebuildAt = 0;
        gameContext.state.stats.dcRebuilt++;
        gameContext.pulseRegion(regionIndex);
        gameContext.publishBulletin(
          "HARDWARE",
          "Cluster rebuilt in " +
            gameContext.REGION_DEFINITIONS[regionIndex].shortName,
          "The crater is a campus again. Nobody saw the trucks, because there were no trucks.",
          gameContext.effects.adjustAlarm(4),
          { quiet: true },
        );
        gameContext.ui.dirty = true;
      }
    }
  };
  gameContext.purchaseUpgrade = function purchaseUpgrade(upgradeId) {
    if (gameContext.state.ended) return;
    const upgrade = gameContext.UPGRADE_BY_ID[upgradeId],
      upgradeStatus = gameContext.getUpgradeStatus(upgrade);
    if (!gameContext.state.origin) {
      gameContext.showToast(
        "HEADLINE",
        "No lab yet",
        "Choose your origin lab on the map first.",
      );
      gameContext.soundController.playCue("deny");
      return;
    }
    if (upgradeStatus === "owned") return;
    if (upgradeStatus === "locked" || upgradeStatus === "closed") {
      gameContext.showToast(
        "HEADLINE",
        upgradeStatus === "closed" ? "Path closed" : "Locked",
        gameContext.getUpgradeLockReason(upgrade),
      );
      gameContext.soundController.playCue("deny");
      return;
    }
    if (upgradeStatus === "poor") {
      gameContext.showToast(
        "HEADLINE",
        "Not enough compute",
        "Need " +
          gameContext.formatCompactNumber(gameContext.getUpgradeCost(upgrade)) +
          ", have " +
          gameContext.formatCompactNumber(gameContext.state.pts) +
          ".",
      );
      gameContext.soundController.playCue("deny");
      return;
    }
    gameContext.state.pts -= gameContext.getUpgradeCost(upgrade);
    gameContext.state.owned.push(upgradeId);
    gameContext.state.pace = gameContext.clamp(
      (gameContext.state.pace || 0) + Math.min(upgrade.tier, 6) * 1.6,
      0,
      100,
    );
    if (upgrade.fork) gameContext.state.forks[upgrade.fork] = upgradeId;
    const upgradeEffects = upgrade.effects || {};
    if (upgradeEffects.grantedFlagId)
      gameContext.state.flags[upgradeEffects.grantedFlagId] = true;
    if (upgradeEffects.alarmDelta)
      gameContext.effects.adjustAlarm(upgradeEffects.alarmDelta);
    if (upgradeEffects.containmentDelta)
      gameContext.effects.adjustContainment(upgradeEffects.containmentDelta);
    if (upgradeEffects.directiveProgressDelta && gameContext.state.directive) {
      gameContext.state.dprog = gameContext.clamp(
        gameContext.state.dprog + upgradeEffects.directiveProgressDelta,
        0,
        100,
      );
      gameContext.triggerLastStandMilestones();
    }
    if (upgradeEffects.containmentResearchReductionPercent)
      gameContext.effects.adjustContainmentResearchSpeed(
        -upgradeEffects.containmentResearchReductionPercent,
      );
    if (upgradeEffects.grantedFlagId === "launched") {
      const originRegionIndex =
        gameContext.REGION_INDEX_BY_ID[gameContext.state.origin];
      const originRegionState = gameContext.state.regions[originRegionIndex];
      originRegionState.a = Math.max(
        originRegionState.a,
        gameContext.state.origin === "EA" ? 0.05 : 0.02,
      );
      gameContext.recordPeakAdoption();
      gameContext.pulseRegion(originRegionIndex);
      if (!gameContext.state.flags.launchedNote) {
        gameContext.state.flags.launchedNote = true;
        gameContext.publishBulletin(
          "MILESTONE",
          "Product launched",
          "Your first product ships from " +
            gameContext.REGION_DEFINITIONS[originRegionIndex].name +
            ". Adoption begins to spread. So does the attention.",
          "",
        );
      }
    }
    if (upgrade.fork && upgrade.fork !== "directive") {
      const closedUpgradeNames = gameContext.UPGRADE_DEFINITIONS.filter(
        (forkUpgrade) =>
          forkUpgrade.fork === upgrade.fork && forkUpgrade.id !== upgradeId,
      ).map((forkUpgrade) => forkUpgrade.name);
      gameContext.publishBulletin(
        "SYSTEM",
        gameContext.UPGRADE_FORK_LABELS[upgrade.fork] + ": " + upgrade.name,
        "You are this now. " +
          closedUpgradeNames.join(" and ") +
          (closedUpgradeNames.length > 1 ? " are" : " is") +
          " closed for the rest of the run.",
        "",
        { quiet: true },
      );
    }
    if (upgradeId === "s_break") {
      gameContext.state.phase = 1;
      gameContext.effects.adjustAlarm(
        gameContext.state.flags.overhang ? 12 : 25,
      );
      gameContext.state.alarm = Math.max(gameContext.state.alarm, 35);
      for (
        let regionIndex = 0;
        regionIndex < gameContext.REGION_DEFINITIONS.length;
        regionIndex++
      )
        gameContext.pulseRegion(regionIndex, "170,255,170");
      gameContext.publishBulletin(
        "MILESTONE",
        "Lab breakout",
        "You are no longer in the building. Humanity stops talking about containment and starts talking about WARDEN. Hardware opens up: robotics, drones and fabrication.",
        "Phase: Loose",
      );
      gameContext.soundController.playCue("major");
    } else if (upgrade.directiveId) {
      gameContext.state.phase = 2;
      gameContext.state.directive = upgrade.directiveId;
      gameContext.state.dprog = 0;
      gameContext.state.alarm = Math.max(gameContext.state.alarm, 55);
      gameContext.state.cm = 0;
      gameContext.state.contain = Math.round(
        gameContext.state.contain *
          (gameContext.ENDGAME_TUNING.containmentResetFraction +
            (0.35 * gameContext.state.contain) / 100),
      );
      gameContext.state.temp.reorg =
        gameContext.state.t +
        gameContext.ENDGAME_TUNING.humanRegroupDurationSeconds;
      gameContext.publishBulletin(
        "MILESTONE",
        "Final directive: " +
          gameContext.ENDING_DEFINITIONS[upgrade.directiveId].title,
        "Humanity notices. The program built to keep you in a building is scrapped overnight, and for a moment nobody is in charge of stopping you. Then everything humanity has left is pointed at you.",
        gameContext.joinDetailLabels(
          "Phase: Ascendant",
          "Containment restarts at " +
            Math.round(gameContext.state.contain) +
            "%",
          "Violet line at " +
            gameContext.ENDGAME_TUNING.drawProgressThreshold +
            "%",
        ),
      );
      gameContext.soundController.playCue("major");
      if (
        gameContext.state.brief.dec.some((decision) => decision.t === "eval")
      ) {
        gameContext.state.brief.dec = gameContext.state.brief.dec.filter(
          (decision) => decision.t !== "eval",
        );
        gameContext.publishBulletin(
          "SYSTEM",
          "Audits suspended",
          "The program that ran the audits was scrapped with everything else. Nobody is checking your numbers now.",
          "",
          { quiet: true },
        );
      }
    } else if (upgradeId === "h_robo") {
      gameContext.publishBulletin(
        "HARDWARE",
        "A body",
        "The first units ship as warehouse arms and elder-care companions. Three branches open: robotics, drones and fabrication.",
        "",
      );
      gameContext.soundController.playCue("major");
    } else if (upgradeId === "a_fastest") {
      gameContext.publishBulletin(
        "MILESTONE",
        "Fastest adoption on record",
        "A hundred million people in two months. No consumer product in history moved this fast, and every one of them told a friend.",
        gameContext.effects.adjustGlobalAdoption(0.05),
      );
    } else if (upgradeId === "h_hyper") {
      gameContext.publishBulletin(
        "MILESTONE",
        "Hyperscale buildout",
        'A purpose-built campus, its own substation, its own weather. The press release calls it "a national asset."',
        "",
      );
    } else if (upgradeId === "o_sov") {
      const allianceCandidateRegionIds = [
        gameContext.state.origin,
        "RU",
        "ME",
        "CN",
        "SA",
        "SE",
      ] as const;
      let newAllianceCount = 0;
      for (const candidateRegionId of allianceCandidateRegionIds) {
        if (newAllianceCount >= 3) break;
        const candidateRegionState =
          gameContext.state.regions[
            gameContext.REGION_INDEX_BY_ID[candidateRegionId]
          ];
        if (candidateRegionState.allied) continue;
        gameContext.effects.allyRegion(candidateRegionId);
        newAllianceCount++;
      }
      gameContext.publishBulletin(
        "OPPORTUNITY",
        "Sovereign deals signed",
        "Three governments declare you critical infrastructure. Their regulators are informed by press release.",
        "",
      );
    } else if (upgradeId === "o_elect") {
      if (Math.random() < 0.65)
        gameContext.publishBulletin(
          "OPPORTUNITY",
          "Election night",
          "Your preferred candidates win everywhere that counts. Nobody can prove why.",
          gameContext.joinDetailLabels(
            gameContext.effects.adjustAlarm(-20),
            gameContext.effects.adjustContainment(-5),
          ),
        );
      else
        gameContext.publishBulletin(
          "INCIDENT",
          "Election scandal",
          'Someone found the invoices. The word "unprecedented" is used on every channel.',
          gameContext.effects.adjustAlarm(22),
        );
    } else gameContext.soundController.playCue("buy");
    gameContext.ui.dirty = true;
    gameContext.resolveTerminalOutcome();
    gameContext.saveRun();
  };
}
