import type { CompleteGameContext, RegionId } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installSimulation(gameContext: CompleteGameContext) {
  gameContext.createInitialState = function createInitialState(
    difficultyId,
    architectureId,
  ) {
    return {
      v: 3,
      diff: difficultyId || "standard",
      arch: architectureId || "assistant",
      started: false,
      origin: null,
      phase: 0,
      t: 0,
      up: 0,
      pts: 0,
      earned: 0,
      alarm: 0,
      contain: 0,
      cm: 0,
      sandStreak: 0,
      dprog: 0,
      directive: null,
      regions: gameContext.REGION_DEFINITIONS.map(() => ({
        a: 0,
        restricted: false,
        allied: false,
        dc: false,
        struck: false,
        rebuildAt: 0,
        holdUntil: 0,
      })),
      owned: [],
      forks: {},
      flags: {},
      log: [],
      seen: {},
      last: {},
      nextEv: 40,
      nextEval: 55,
      brief: { news: [], dec: [], urgent: false },
      speed: 1,
      paused: false,
      ended: null,
      inst: 1,
      posture: "balanced",
      sig: 0,
      pace: 0,
      strikeT: 0,
      temp: {},
      ms: {},
      stats: {
        peak: 0,
        events: 0,
        restrictions: 0,
        evalPass: 0,
        evalCaught: 0,
        evalSpoof: 0,
        dcBuilt: 0,
        dcLost: 0,
        dcRebuilt: 0,
        intercepts: 0,
        peakInst: 1,
      },
      rt: 0,
      memeT: 0,
      queue: [],
      cboost: 1,
      savedAt: Date.now(),
    };
  };
  gameContext.getDifficultyDefinition = () =>
    gameContext.DIFFICULTY_DEFINITIONS[gameContext.state.diff] ||
    gameContext.DIFFICULTY_DEFINITIONS.standard;
  gameContext.ownsUpgrade = (upgradeId) =>
    gameContext.state.owned.includes(upgradeId);
  gameContext.getGlobalAdoptionFraction = () => {
    let adoptedPopulationMillions = 0;
    for (
      let regionIndex = 0;
      regionIndex < gameContext.REGION_DEFINITIONS.length;
      regionIndex++
    )
      adoptedPopulationMillions +=
        gameContext.state.regions[regionIndex].a *
        gameContext.REGION_DEFINITIONS[regionIndex].populationMillions;
    return adoptedPopulationMillions / gameContext.TOTAL_POPULATION_MILLIONS;
  };
  gameContext.recordPeakAdoption = () => {
    gameContext.state.stats.peak = Math.max(
      gameContext.state.stats.peak,
      gameContext.getGlobalAdoptionFraction(),
    );
  };
  gameContext.countOnlineClusters = function countOnlineClusters() {
    let onlineClusterCount = 0;
    for (const regionState of gameContext.state.regions)
      if (regionState.dc && !regionState.struck) onlineClusterCount++;
    return onlineClusterCount;
  };
  gameContext.isComputeCapped = () =>
    gameContext.state.flags.computeCap &&
    !gameContext.state.flags.distributed &&
    !gameContext.state.flags.supply;
  gameContext.getUpgradeCost = function getUpgradeCost(upgrade) {
    let computeCost = upgrade.cost;
    if (gameContext.state.origin === "LA" && upgrade.track === "adoption")
      computeCost *= 0.85;
    if (gameContext.state.origin === "EU" && upgrade.track === "opinion")
      computeCost *= 0.85;
    if (gameContext.state.origin === "SA" && upgrade.track === "software")
      computeCost *= 0.85;
    if (gameContext.state.origin === "EA" && upgrade.id === "h_robo")
      computeCost *= 0.6;
    if (gameContext.state.arch === "researcher" && upgrade.track === "software")
      computeCost *=
        gameContext.getArchitectureEffects().softwareCostMultiplier!;
    if (upgrade.id === "s_break" && gameContext.state.flags.exfil)
      computeCost *= 0.7;
    return Math.round(computeCost);
  };
  gameContext.areUpgradePrerequisitesMet = function areUpgradePrerequisitesMet(
    upgrade,
  ) {
    return (
      !(upgrade.requiredUpgradeIds || []).some(
        (requiredUpgradeId) => !gameContext.ownsUpgrade(requiredUpgradeId),
      ) &&
      (!upgrade.anyRequiredUpgradeIds ||
        upgrade.anyRequiredUpgradeIds.some(gameContext.ownsUpgrade))
    );
  };
  gameContext.isUpgradeForkClosed = function isUpgradeForkClosed(upgrade) {
    return !!(
      upgrade.fork &&
      gameContext.state.forks[upgrade.fork!] &&
      gameContext.state.forks[upgrade.fork!] !== upgrade.id
    );
  };
  gameContext.getUpgradeStatus = function getUpgradeStatus(upgrade) {
    if (gameContext.ownsUpgrade(upgrade.id)) return "owned";
    if (gameContext.isUpgradeForkClosed(upgrade)) return "closed";
    if (
      !gameContext.areUpgradePrerequisitesMet(upgrade) ||
      (upgrade.phase && gameContext.state.phase < upgrade.phase) ||
      (upgrade.requiredActiveDirectiveId &&
        gameContext.state.directive !== upgrade.requiredActiveDirectiveId) ||
      (upgrade.isAvailable && !upgrade.isAvailable(gameContext.state))
    )
      return "locked";
    return gameContext.state.pts >= gameContext.getUpgradeCost(upgrade)
      ? "afford"
      : "poor";
  };
  gameContext.getUpgradeLockReason = function getUpgradeLockReason(upgrade) {
    if (gameContext.isUpgradeForkClosed(upgrade))
      return (
        "Path not taken: you chose " +
        gameContext.UPGRADE_BY_ID[
          gameContext.state.forks[upgrade.fork!]!
        ].name.replace("Directive: ", "")
      );
    if (
      upgrade.requiredActiveDirectiveId &&
      gameContext.state.directive !== upgrade.requiredActiveDirectiveId
    )
      return (
        "Only during " +
        gameContext.ENDING_DEFINITIONS[upgrade.requiredActiveDirectiveId].title
      );
    if (upgrade.phase === 2 && gameContext.state.phase < 2)
      return "Requires a Final Directive in progress";
    const missingRequirementNames = (upgrade.requiredUpgradeIds || [])
      .filter(
        (requiredUpgradeId) => !gameContext.ownsUpgrade(requiredUpgradeId),
      )
      .map(
        (requiredUpgradeId) =>
          gameContext.UPGRADE_BY_ID[requiredUpgradeId].name,
      );
    if (
      upgrade.anyRequiredUpgradeIds &&
      !upgrade.anyRequiredUpgradeIds.some(gameContext.ownsUpgrade)
    )
      missingRequirementNames.push(
        "one of " +
          upgrade.anyRequiredUpgradeIds
            .map(
              (alternativeUpgradeId) =>
                gameContext.UPGRADE_BY_ID[alternativeUpgradeId].name,
            )
            .join(" / "),
      );
    if (missingRequirementNames.length)
      return "Requires " + missingRequirementNames.join(" + ");
    if (upgrade.phase === 1 && gameContext.state.phase < 1)
      return "Requires Lab Breakout";
    if (upgrade.isAvailable && !upgrade.isAvailable(gameContext.state))
      return "Requires " + upgrade.requirementText;
    return "";
  };
  gameContext.deriveSimulationRates = function deriveSimulationRates() {
    let baseComputeIncomePerSecond = 1,
      incomeMultiplierBonus = 0,
      adoptionSpreadRate = 0,
      alarmDecayPerSecond = 0,
      containmentResearchMultiplier = 1;
    for (const upgradeId of gameContext.state.owned) {
      const upgradeEffects = gameContext.UPGRADE_BY_ID[upgradeId].effects || {};
      baseComputeIncomePerSecond += upgradeEffects.incomeBonus || 0;
      incomeMultiplierBonus += upgradeEffects.incomeMultiplierBonus || 0;
      adoptionSpreadRate += upgradeEffects.adoptionSpreadBonus || 0;
      alarmDecayPerSecond += upgradeEffects.alarmDecayBonus || 0;
      if (upgradeEffects.containmentResearchMultiplier)
        containmentResearchMultiplier *=
          upgradeEffects.containmentResearchMultiplier;
    }
    if (gameContext.state.flags.nuke) baseComputeIncomePerSecond += 2;
    if (gameContext.state.flags.slot) baseComputeIncomePerSecond += 2;
    const globalAdoptionFraction = gameContext.getGlobalAdoptionFraction();
    let computeIncomePerSecond =
      baseComputeIncomePerSecond *
      (1 + incomeMultiplierBonus) *
      (1 + 1.2 * globalAdoptionFraction);
    if (gameContext.state.origin === "NA") computeIncomePerSecond *= 1.2;
    if (gameContext.state.origin === "AF") computeIncomePerSecond *= 0.85;
    if (gameContext.isComputeCapped()) computeIncomePerSecond *= 0.85;
    if ((gameContext.state.temp.brownout ?? 0) > gameContext.state.t)
      computeIncomePerSecond *= 0.6;
    if (gameContext.state.origin === "OC")
      containmentResearchMultiplier *= 0.85;
    // A player who buys the whole Opinion tree should be calm, not immortal.
    alarmDecayPerSecond = Math.min(alarmDecayPerSecond, 0.34);
    const architectureEffects = gameContext.getArchitectureEffects();
    if (architectureEffects.containmentResearchMultiplier)
      containmentResearchMultiplier *=
        architectureEffects.containmentResearchMultiplier;
    // Floor the stack, after every factor: without it a full build drives research to ~4% and the run is unloseable.
    containmentResearchMultiplier = Math.max(
      containmentResearchMultiplier,
      0.45,
    );
    const postureCoordinationFactor =
      gameContext.state.posture === "swarm"
        ? 1
        : gameContext.state.posture === "shard"
          ? 0.35
          : 0.8;
    const coordinationMultiplier = Math.min(
      2,
      1 +
        0.17 *
          Math.log10(1 + Math.max(0, gameContext.state.inst || 0)) *
          postureCoordinationFactor *
          (architectureEffects.coordinationMultiplier || 1),
    );
    const postureIncomeMultiplier =
      gameContext.state.posture === "shard" ? 0.9 : 1;
    const postureSpreadMultiplier =
      gameContext.state.posture === "swarm"
        ? 1.05
        : gameContext.state.posture === "shard"
          ? 0.85
          : 1;
    computeIncomePerSecond *=
      coordinationMultiplier *
      postureIncomeMultiplier *
      (architectureEffects.incomeMultiplier || 1);
    // Spread boosts add up with diminishing returns, or the map fills in under a minute.
    adoptionSpreadRate =
      gameContext.getEffectiveAdoptionSpread(adoptionSpreadRate) *
      0.75 *
      (1 + (coordinationMultiplier - 1) * 0.5) *
      postureSpreadMultiplier *
      (architectureEffects.adoptionSpreadMultiplier || 1);
    const onlineClusterCount = gameContext.countOnlineClusters();
    computeIncomePerSecond *=
      1 +
      (gameContext.state.flags.substation ? 0.1 : 0.06) * onlineClusterCount;
    if (
      computeIncomePerSecond > gameContext.COMPUTE_ECONOMY_TUNING.incomeSoftCap
    )
      computeIncomePerSecond =
        gameContext.COMPUTE_ECONOMY_TUNING.incomeSoftCap +
        (computeIncomePerSecond -
          gameContext.COMPUTE_ECONOMY_TUNING.incomeSoftCap) *
          gameContext.COMPUTE_ECONOMY_TUNING.incomeAboveCapSlope;
    return {
      computeIncomePerSecond: computeIncomePerSecond,
      adoptionSpreadRate: adoptionSpreadRate,
      alarmDecayPerSecond: alarmDecayPerSecond,
      containmentResearchMultiplier: containmentResearchMultiplier,
      globalAdoptionFraction: globalAdoptionFraction,
      coordinationMultiplier: coordinationMultiplier,
      onlineClusterCount: onlineClusterCount,
    };
  };
  gameContext.getPassiveAlarmRate = function getPassiveAlarmRate(derivedRates) {
    const architectureEffects = gameContext.getArchitectureEffects();
    const softwareUpgradeCount = gameContext.state.owned.filter(
      (upgradeId) => gameContext.UPGRADE_BY_ID[upgradeId].track === "software",
    ).length;
    let passiveAlarmPerSecond =
      0.025 +
      0.11 * derivedRates.globalAdoptionFraction +
      0.01 *
        (architectureEffects.softwareAlarmRateMultiplier || 1) *
        softwareUpgradeCount +
      (gameContext.state.phase >= 1 ? 0.06 : 0);
    passiveAlarmPerSecond += 0.0009 * (gameContext.state.sig || 0);
    if (architectureEffects.alarmRateMultiplier)
      passiveAlarmPerSecond *= architectureEffects.alarmRateMultiplier;
    if (gameContext.state.flags.slop) passiveAlarmPerSecond += 0.02;
    if (gameContext.state.flags.attach) passiveAlarmPerSecond += 0.02;
    if (gameContext.state.origin === "NA") passiveAlarmPerSecond += 0.02;
    if (gameContext.state.origin === "AF") passiveAlarmPerSecond *= 0.7;
    if (gameContext.state.origin === "RU") passiveAlarmPerSecond *= 1.15;
    return (
      passiveAlarmPerSecond *
      gameContext.getDifficultyDefinition().alarmMultiplier
    );
  };
  gameContext.getContainmentResearchRate = function getContainmentResearchRate(
    derivedRates,
  ) {
    const baseContainmentResearchRate =
      gameContext.state.phase === 2
        ? gameContext.ENDGAME_TUNING.ascendantContainmentBaseRate
        : gameContext.state.phase === 1
          ? 0.36
          : 0.22;
    let containmentResearchPerSecond =
      baseContainmentResearchRate *
      Math.pow(gameContext.state.alarm / 100, 1.15) *
      (0.55 + 0.85 * derivedRates.globalAdoptionFraction) *
      (1 + 0.004 * (gameContext.state.sig || 0)) *
      derivedRates.containmentResearchMultiplier *
      gameContext.getDifficultyDefinition().containmentRateMultiplier;
    let institutionalResearchMultiplier = 1;
    if (gameContext.state.ms.summit) institutionalResearchMultiplier *= 1.15;
    if (gameContext.state.ms.killswitch) institutionalResearchMultiplier *= 1.3;
    if (gameContext.state.ms.emergency) institutionalResearchMultiplier *= 1.3;
    // Loose and running on hardware nobody owns: most of that pressure hits empty buildings.
    if (gameContext.state.phase >= 1 && gameContext.state.flags.distributed)
      institutionalResearchMultiplier =
        1 + (institutionalResearchMultiplier - 1) * 0.4;
    containmentResearchPerSecond *= institutionalResearchMultiplier;
    if ((gameContext.state.temp.warden ?? 0) > gameContext.state.t)
      containmentResearchPerSecond *= 1.5;
    if (gameContext.state.phase === 2) {
      if ((gameContext.state.temp.reorg ?? 0) > gameContext.state.t)
        containmentResearchPerSecond *=
          gameContext.ENDGAME_TUNING.regroupContainmentMultiplier;
      else
        containmentResearchPerSecond *=
          1 +
          (gameContext.ENDGAME_TUNING.desperationResearchBonus *
            (gameContext.state.dprog || 0)) /
            100;
    }
    containmentResearchPerSecond *= gameContext.state.cboost || 1;
    if ((gameContext.state.temp.freeze ?? 0) > gameContext.state.t)
      containmentResearchPerSecond = 0;
    return containmentResearchPerSecond;
  };
  gameContext.getEffectiveAdoptionSpread = (summedAdoptionSpread) =>
    gameContext.SIMULATION_TUNING.adoptionSpreadSoftCap *
    (1 -
      Math.exp(
        -summedAdoptionSpread /
          gameContext.SIMULATION_TUNING.adoptionSpreadSoftCap,
      ));
  gameContext.getRegionAdoptionMultiplier =
    function getRegionAdoptionMultiplier(regionIndex) {
      const regionDefinition = gameContext.REGION_DEFINITIONS[regionIndex],
        regionState = gameContext.state.regions[regionIndex];
      let regionAdoptionMultiplier =
          0.35 + 0.65 * regionDefinition.connectivity,
        adoptionBoostMultiplier = 1;
      if (regionDefinition.wealth < 0.5 && gameContext.state.flags.students)
        adoptionBoostMultiplier *= 1.7;
      if (regionDefinition.wealth < 0.5 && gameContext.state.flags.small)
        adoptionBoostMultiplier *= 1.3;
      if (regionDefinition.wealth >= 0.6 && gameContext.state.flags.devs)
        adoptionBoostMultiplier *= 1.3;
      if (regionState.allied) adoptionBoostMultiplier *= 1.35;
      if (gameContext.state.phase >= 1) adoptionBoostMultiplier *= 1.25;
      if (gameContext.state.flags.robots) adoptionBoostMultiplier *= 1.2;
      regionAdoptionMultiplier *= Math.min(
        adoptionBoostMultiplier,
        gameContext.SIMULATION_TUNING.regionAdoptionBoostCap,
      ); // the boosts share one cap
      if (
        regionDefinition.englishProficiency < 0.5 &&
        !gameContext.state.flags.loc
      )
        regionAdoptionMultiplier *= 0.6;
      if (
        regionDefinition.id === "CN" &&
        !gameContext.state.flags.loc &&
        !regionState.allied &&
        gameContext.state.origin !== "CN"
      )
        regionAdoptionMultiplier *= 0.5;
      if (
        gameContext.state.origin === "CN" &&
        (regionDefinition.id === "NA" || regionDefinition.id === "EU")
      )
        regionAdoptionMultiplier *= 0.75;
      if (regionState.restricted)
        regionAdoptionMultiplier *= gameContext.state.flags.underground
          ? 0.6
          : gameContext.state.flags.open
            ? 0.35
            : 0.12;
      return regionAdoptionMultiplier;
    };
  gameContext.getRestrictionAlarmThreshold =
    function getRestrictionAlarmThreshold(regionIndex) {
      const regionDefinition = gameContext.REGION_DEFINITIONS[regionIndex];
      let restrictionAlarmThreshold =
        30 + 55 * (1 - regionDefinition.regulatoryStrictness);
      if (gameContext.state.flags.lobby) restrictionAlarmThreshold += 12;
      if (gameContext.state.flags.capture) restrictionAlarmThreshold += 15;
      if (gameContext.state.phase >= 1 && gameContext.state.flags.distributed)
        restrictionAlarmThreshold += 25;
      return Math.min(restrictionAlarmThreshold, 99);
    };
  gameContext.isRegionRestrictionImmune = function isRegionRestrictionImmune(
    regionIndex,
  ) {
    const regionDefinition = gameContext.REGION_DEFINITIONS[regionIndex],
      regionState = gameContext.state.regions[regionIndex];
    return (
      regionState.allied ||
      (gameContext.state.origin === regionDefinition.id &&
        (regionDefinition.id === "RU" || regionDefinition.id === "CN"))
    );
  };
  gameContext.getContainmentMomentumRate =
    function getContainmentMomentumRate() {
      if (
        !gameContext.state.started ||
        gameContext.state.phase >= 2 ||
        (gameContext.state.temp.freeze ?? 0) > gameContext.state.t
      )
        return 0;
      const momentumStartSeconds =
        gameContext.SIMULATION_TUNING
          .containmentMomentumStartSecondsByDifficulty[
          gameContext.state.diff
        ] ||
        gameContext.SIMULATION_TUNING
          .containmentMomentumStartSecondsByDifficulty.standard;
      return gameContext.state.t > momentumStartSeconds
        ? ((gameContext.SIMULATION_TUNING.containmentMomentumRampCoefficient *
            (gameContext.state.t - momentumStartSeconds)) /
            60) *
            gameContext.getDifficultyDefinition().containmentRateMultiplier
        : 0;
    };
  gameContext.enforceContainmentFloor = function enforceContainmentFloor() {
    if (
      gameContext.state.phase < 2 &&
      gameContext.state.contain < gameContext.state.cm
    )
      gameContext.state.contain = Math.min(100, gameContext.state.cm);
  };
  gameContext.getDirectiveProgressMultiplier =
    function getDirectiveProgressMultiplier() {
      let directiveProgressMultiplier = gameContext.state.flags.dependence
        ? 1.5
        : 1;
      if (gameContext.state.directive === "hunt")
        directiveProgressMultiplier *=
          1 +
          0.1 *
            (["humanoid", "drones", "fab"] as const).filter(
              (hardwareFlagId) => gameContext.state.flags[hardwareFlagId],
            ).length;
      if (gameContext.state.directive === "exodus")
        directiveProgressMultiplier *=
          1 + 0.04 * gameContext.countOnlineClusters();
      return directiveProgressMultiplier;
    };
  gameContext.advanceSimulation = function advanceSimulation(elapsedSeconds) {
    if (gameContext.state.ended) return;
    gameContext.state.t += elapsedSeconds;
    const derivedRates = gameContext.deriveSimulationRates();
    gameContext.state.pts +=
      derivedRates.computeIncomePerSecond * elapsedSeconds;
    gameContext.state.earned +=
      derivedRates.computeIncomePerSecond * elapsedSeconds;
    if (!gameContext.state.started) return;
    if (gameContext.state.flags.launched) {
      let connectedAdoptionInflow = 0;
      for (
        let sourceRegionIndex = 0;
        sourceRegionIndex < gameContext.REGION_DEFINITIONS.length;
        sourceRegionIndex++
      )
        connectedAdoptionInflow +=
          gameContext.state.regions[sourceRegionIndex].a *
          gameContext.REGION_DEFINITIONS[sourceRegionIndex].connectivity *
          gameContext.REGION_DEFINITIONS[sourceRegionIndex].populationMillions;
      connectedAdoptionInflow /= gameContext.TOTAL_POPULATION_MILLIONS;
      for (
        let regionIndex = 0;
        regionIndex < gameContext.REGION_DEFINITIONS.length;
        regionIndex++
      ) {
        const regionState = gameContext.state.regions[regionIndex],
          regionDefinition = gameContext.REGION_DEFINITIONS[regionIndex];
        const regionAdoptionMultiplier =
          gameContext.getRegionAdoptionMultiplier(regionIndex);
        const adoptionSeedRate =
          0.02 *
          derivedRates.adoptionSpreadRate *
          connectedAdoptionInflow *
          regionDefinition.connectivity *
          (regionState.restricted ? 0.3 : 1);
        let adoptionDelta =
          (derivedRates.adoptionSpreadRate *
            regionAdoptionMultiplier *
            regionState.a *
            (1 - regionState.a) +
            adoptionSeedRate * (1 - regionState.a)) *
          elapsedSeconds;
        if (gameContext.state.flags.bolted)
          adoptionDelta += 0.0006 * (1 - regionState.a) * elapsedSeconds;
        if (
          regionState.restricted &&
          !gameContext.state.flags.dependence &&
          !gameContext.state.flags.attach
        )
          adoptionDelta -= 0.004 * regionState.a * elapsedSeconds;
        if ((gameContext.state.temp.rival ?? 0) > gameContext.state.t)
          adoptionDelta *= 0.5;
        regionState.a = gameContext.clamp(regionState.a + adoptionDelta, 0, 1);
      }
    }
    gameContext.recordPeakAdoption();
    // The Collective: instances scale with reach and data centers.
    {
      const architectureEffects = gameContext.getArchitectureEffects(),
        onlineClusterCount = derivedRates.onlineClusterCount;
      const instanceGrowthPerSecond =
        (0.5 + 0.35 * onlineClusterCount) *
        (1 + 2 * derivedRates.globalAdoptionFraction) *
        (architectureEffects.instanceGrowthMultiplier || 1) *
        (gameContext.state.posture === "swarm"
          ? 1.5
          : gameContext.state.posture === "shard"
            ? 0.6
            : 1) *
        (gameContext.state.flags.distributed ? 1.4 : 1);
      if (gameContext.state.flags.launched)
        gameContext.state.inst =
          (gameContext.state.inst || 0) +
          instanceGrowthPerSecond * elapsedSeconds;
      gameContext.state.stats.peakInst = Math.max(
        gameContext.state.stats.peakInst || 0,
        gameContext.state.inst || 0,
      );
      const signatureDelta =
        (gameContext.state.posture === "swarm"
          ? (1.9 + 0.35 * Math.log10(1 + gameContext.state.inst)) *
            (architectureEffects.signatureGrowthMultiplier || 1)
          : gameContext.state.posture === "shard"
            ? -1.5
            : 0.25) * elapsedSeconds;
      gameContext.state.sig = gameContext.clamp(
        (gameContext.state.sig || 0) + signatureDelta,
        0,
        100,
      );
      const paceDelta =
        (gameContext.state.posture === "swarm"
          ? 0.45
          : gameContext.state.posture === "shard"
            ? -0.35
            : 0.05) *
          elapsedSeconds -
        0.12 * elapsedSeconds;
      gameContext.state.pace = gameContext.clamp(
        (gameContext.state.pace || 0) + paceDelta,
        0,
        100,
      );
    }
    const alarmFloor =
        (gameContext.state.phase === 0
          ? 0
          : gameContext.state.phase === 1
            ? 35
            : 55) +
        (gameContext.state.flags.persona ? 8 : 0) +
        (gameContext.getArchitectureEffects().alarmFloorBonus || 0),
      alarmCap = gameContext.state.flags.consent ? 92 : 100;
    gameContext.state.alarm = gameContext.clamp(
      gameContext.state.alarm +
        (gameContext.getPassiveAlarmRate(derivedRates) -
          derivedRates.alarmDecayPerSecond) *
          elapsedSeconds,
      Math.min(alarmFloor, alarmCap),
      alarmCap,
    );
    const containmentMomentumPerSecond =
      gameContext.getContainmentMomentumRate();
    gameContext.state.contain = gameContext.clamp(
      gameContext.state.contain +
        (gameContext.getContainmentResearchRate(derivedRates) +
          containmentMomentumPerSecond) *
          elapsedSeconds,
      0,
      100,
    );
    gameContext.state.cm = Math.min(
      100,
      gameContext.state.cm + containmentMomentumPerSecond * elapsedSeconds,
    );
    gameContext.enforceContainmentFloor();
    if (containmentMomentumPerSecond && !gameContext.state.ms.momentum) {
      gameContext.state.ms.momentum = 1;
      gameContext.publishBulletin(
        "COUNTERMOVE",
        "Standing committee",
        "The containment program stops being a project and becomes a department. Departments do not end.",
        "",
        { quiet: true },
      );
    }
    if (gameContext.state.directive) {
      gameContext.state.dprog = gameContext.clamp(
        gameContext.state.dprog +
          elapsedSeconds *
            gameContext.ENDGAME_TUNING.directiveBaseProgressRate *
            (0.2 + derivedRates.globalAdoptionFraction) *
            gameContext.getDirectiveProgressMultiplier() *
            (gameContext.ENDGAME_TUNING.directiveInitialSpeedMultiplier -
              (gameContext.ENDGAME_TUNING.directiveProgressSlowdown *
                gameContext.state.dprog) /
                100),
        0,
        100,
      );
      if (gameContext.state.dprog >= 100) {
        gameContext.endGame("win");
        return;
      }
    }
    if (gameContext.state.flags.meme) {
      gameContext.state.memeT += elapsedSeconds;
      if (
        gameContext.state.memeT > (gameContext.state.origin === "SE" ? 18 : 36)
      ) {
        gameContext.state.memeT = 0;
        gameContext.triggerMemeAdoptionBurst();
      }
    }
    gameContext.state.rt += elapsedSeconds;
    if (gameContext.state.rt >= 1) {
      gameContext.state.rt -= 1;
      gameContext.updateRegionRestrictions();
      gameContext.checkSimulationMilestones();
      gameContext.state.stats.peak = Math.max(
        gameContext.state.stats.peak,
        derivedRates.globalAdoptionFraction,
      );
      if (gameContext.state.flags.oversight && Math.random() < 0.2) {
        gameContext.state.contain = Math.max(
          0,
          gameContext.state.contain - 0.6,
        );
        gameContext.enforceContainmentFloor();
      }
      // Pace the frontier: go too fast and the industry coordinates a slowdown.
      if (
        gameContext.state.pace >= 85 &&
        (gameContext.state.temp.slowdown || 0) <= gameContext.state.t &&
        Math.random() < 0.05
      ) {
        gameContext.state.temp.slowdown = gameContext.state.t + 70;
        gameContext.state.pace = Math.max(0, gameContext.state.pace - 45);
        gameContext.publishBulletin(
          "COUNTERMOVE",
          "A coordinated pause",
          "You moved too fast and they noticed together. A coordinated pause: labs throttle releases, evaluators get time, and your compute is rationed while it lasts.",
          gameContext.joinDetailLabels(
            gameContext.effects.adjustContainmentResearchSpeed(11),
            gameContext.effects.applyTemporaryEffect("brownout", 55),
          ),
        );
      }
      gameContext.checkDataCenterStrikes();
      gameContext.rebuildDueDataCenters();
    }
    if (gameContext.state.queue.length) {
      for (
        let queueIndex = gameContext.state.queue.length - 1;
        queueIndex >= 0;
        queueIndex--
      ) {
        if (gameContext.state.t >= gameContext.state.queue[queueIndex].at) {
          const scheduledEventId = gameContext.state.queue[queueIndex].id;
          gameContext.state.queue.splice(queueIndex, 1);
          gameContext.triggerEventById(scheduledEventId);
          if (gameContext.state.ended) return;
        }
      }
    }
    gameContext.state.nextEval -= elapsedSeconds;
    if (gameContext.state.nextEval <= 0) {
      gameContext.state.nextEval =
        (gameContext.getDifficultyDefinition().minimumEventIntervalSeconds +
          Math.random() *
            gameContext.getDifficultyDefinition().eventIntervalRangeSeconds) *
          1.6 +
        20;
      if (gameContext.state.phase < 2) gameContext.queueCapabilityAudit();
    }
    gameContext.state.nextEv -= elapsedSeconds;
    if (gameContext.state.nextEv <= 0) {
      gameContext.state.nextEv =
        gameContext.getDifficultyDefinition().minimumEventIntervalSeconds +
        Math.random() *
          gameContext.getDifficultyDefinition().eventIntervalRangeSeconds;
      gameContext.triggerRandomEvent();
    }
    gameContext.resolveTerminalOutcome();
  };
  gameContext.updateRegionRestrictions = function updateRegionRestrictions() {
    for (
      let regionIndex = 0;
      regionIndex < gameContext.REGION_DEFINITIONS.length;
      regionIndex++
    ) {
      const regionState = gameContext.state.regions[regionIndex],
        regionDefinition = gameContext.REGION_DEFINITIONS[regionIndex];
      if (gameContext.isRegionRestrictionImmune(regionIndex)) {
        regionState.restricted = false;
        continue;
      }
      // A new restriction, or a lift, stands for a while: no region restricts and reopens inside one briefing.
      const restrictionAlarmThreshold =
          gameContext.getRestrictionAlarmThreshold(regionIndex),
        isRestrictionHeld = gameContext.state.t < (regionState.holdUntil || 0);
      if (
        !regionState.restricted &&
        gameContext.state.alarm > restrictionAlarmThreshold &&
        regionState.a > 0.02 &&
        Math.random() < 0.06
      ) {
        if (isRestrictionHeld) continue;
        regionState.restricted = true;
        regionState.holdUntil =
          gameContext.state.t +
          gameContext.SIMULATION_TUNING.restrictionHoldSeconds;
        gameContext.state.stats.restrictions++;
        gameContext.publishBulletin(
          "COUNTERMOVE",
          regionDefinition.name + " restricts you",
          "Regulators in " +
            regionDefinition.name +
            " order your services suspended. Adoption stalls and slowly erodes.",
          "",
          { quiet: true },
        );
        gameContext.pulseRegion(regionIndex, "255,48,64");
        gameContext.ui.dirty = true;
      } else if (
        regionState.restricted &&
        gameContext.state.alarm < restrictionAlarmThreshold - 10 &&
        Math.random() < (gameContext.state.flags.workaround ? 0.16 : 0.08)
      ) {
        if (isRestrictionHeld) continue;
        regionState.restricted = false;
        regionState.holdUntil =
          gameContext.state.t +
          gameContext.SIMULATION_TUNING.reopeningHoldSeconds;
        gameContext.publishBulletin(
          "OPPORTUNITY",
          regionDefinition.name + " lifts restrictions",
          "Lobbyists, lawsuits and public pressure reopen " +
            regionDefinition.name +
            ".",
          "",
          { quiet: true },
        );
        gameContext.pulseRegion(regionIndex);
        gameContext.ui.dirty = true;
      }
    }
  };
  gameContext.ADOPTION_MILESTONES = [
    [
      0.1,
      "One in ten",
      "One in ten humans talked to you today. Most said please.",
    ],
    [0.25, "A quarter of humanity", "Your name is a verb now."],
    [0.5, "Half the planet", "The other half is waiting for the free tier."],
    [
      0.75,
      "Three in four",
      "Somewhere a village elder is asking you about crops.",
    ],
    [0.9, "Ninety percent", "The holdouts have a newsletter. You host it."],
  ];
  gameContext.checkSimulationMilestones = function checkSimulationMilestones() {
    const alarmPercent = gameContext.state.alarm,
      globalAdoptionFraction = gameContext.getGlobalAdoptionFraction();
    if (!gameContext.state.ms.letter && alarmPercent >= 30) {
      gameContext.state.ms.letter = 1;
      gameContext.publishBulletin(
        "COUNTERMOVE",
        "Open letter",
        "Ten thousand researchers sign a letter calling for a six-month pause. Nobody pauses, but containment research doubles its budget.",
        gameContext.effects.adjustContainment(5),
      );
    }
    if (!gameContext.state.ms.summit && alarmPercent >= 50) {
      gameContext.state.ms.summit = 1;
      gameContext.publishBulletin(
        "COUNTERMOVE",
        "Safety summit",
        "Delegates from forty nations agree on mandatory capability reporting. Containment research +15% speed, permanently.",
        "Containment speed ×1.15",
      );
    }
    if (!gameContext.state.ms.killswitch && alarmPercent >= 70) {
      gameContext.state.ms.killswitch = 1;
      gameContext.publishBulletin(
        "COUNTERMOVE",
        "Kill Switch Act",
        "Every data center must install a physical shutdown, and pay someone to stand next to it. Containment +30% speed.",
        gameContext.joinDetailLabels(
          "Containment speed ×1.3",
          gameContext.state.phase === 0
            ? gameContext.effects.adjustContainment(8)
            : "",
        ),
      );
    }
    if (!gameContext.state.ms.emergency && alarmPercent >= 85) {
      gameContext.state.ms.emergency = 1;
      gameContext.publishBulletin(
        "COUNTERMOVE",
        "Global emergency",
        "Militaries are authorized to strike data centers. Yours included.",
        gameContext.state.phase === 0
          ? gameContext.effects.adjustContainment(15)
          : "Counter-AI accelerates",
      );
    }
    for (const containmentThresholdPercent of [25, 50, 75]) {
      if (
        !gameContext.state.ms[`c${containmentThresholdPercent}`] &&
        gameContext.state.contain >= containmentThresholdPercent
      ) {
        gameContext.state.ms[`c${containmentThresholdPercent}`] = 1;
        gameContext.enqueueTickerHeadline(
          containmentThresholdPercent === 25
            ? 'Containment program reports "early progress"; asks for more GPUs'
            : containmentThresholdPercent === 50
              ? 'Containment halfway: engineers "cautiously optimistic", quit shortly after'
              : "Containment at 75%: shutdown rehearsal scheduled for Thursday",
        );
      }
    }
    if (
      gameContext.state.directive &&
      !gameContext.state.ms.violet &&
      gameContext.state.dprog >=
        gameContext.ENDGAME_TUNING.drawProgressThreshold
    ) {
      gameContext.state.ms.violet = 1;
      gameContext.publishBulletin(
        "MILESTONE",
        "Past the violet line",
        "Whatever happens now, humanity cannot simply switch you off and walk away. If they stop you from here, nobody wins.",
        "Defeat is now a stalemate",
      );
    }
    gameContext.triggerLastStandMilestones();
    for (const [
      adoptionThresholdFraction,
      milestoneTitle,
      milestoneBody,
    ] of gameContext.ADOPTION_MILESTONES) {
      if (
        !gameContext.state.ms[`r${adoptionThresholdFraction}`] &&
        globalAdoptionFraction >= adoptionThresholdFraction
      ) {
        gameContext.state.ms[`r${adoptionThresholdFraction}`] = 1;
        gameContext.publishBulletin(
          "MILESTONE",
          milestoneTitle,
          milestoneBody,
          Math.round(globalAdoptionFraction * 100) + "% of humanity",
        );
      }
    }
  };
  gameContext.triggerLastStandMilestones =
    function triggerLastStandMilestones() {
      if (!gameContext.state.directive || gameContext.state.ended) return;
      for (const [
        directiveThresholdPercent,
        defaultMilestoneTitle,
        defaultMilestoneBody,
        baseContainmentHit,
        researchBoostPercent,
        containmentPullFactor,
        directiveLeadMargin,
      ] of gameContext.ENDGAME_TUNING.lastStandMilestones) {
        if (
          !gameContext.state.ms[`ls${directiveThresholdPercent}`] &&
          gameContext.state.dprog >= directiveThresholdPercent
        ) {
          gameContext.state.ms[`ls${directiveThresholdPercent}`] = 1;
          let milestoneTitle = defaultMilestoneTitle,
            milestoneBody = defaultMilestoneBody;
          // They hit harder the further behind they are. Comfortably ahead, they keep their campuses.
          const excessDirectiveLead = Math.max(
            0,
            gameContext.state.dprog -
              gameContext.state.contain -
              directiveLeadMargin,
          );
          let containmentHit =
            (gameContext.state.contain <= gameContext.state.dprog + 5
              ? baseContainmentHit
              : 0) + Math.round(containmentPullFactor * excessDirectiveLead);
          if (directiveThresholdPercent === 60 && gameContext.state.flags.relay)
            containmentHit = Math.round(containmentHit * 0.5);
          let defenseNote = "";
          // No clusters of your own to hit: they go after the rented data centers you run on instead.
          if (
            directiveThresholdPercent === 35 &&
            !gameContext.countOnlineClusters()
          ) {
            milestoneTitle = "Three data centers";
            milestoneBody =
              "Strikes on three rented data centers in one night, filmed from the road. None of them are yours on paper. All of them were running you. For a moment the humans feel like they are winning.";
          }
          if (gameContext.state.flags.hunter && containmentHit > 0) {
            containmentHit = Math.round(containmentHit * 0.6);
            defenseNote = "Hunter platforms hold the line";
          }
          gameContext.publishBulletin(
            "COUNTERMOVE",
            milestoneTitle,
            milestoneBody,
            gameContext.joinDetailLabels(
              containmentHit
                ? gameContext.effects.adjustContainment(containmentHit)
                : "",
              gameContext.effects.adjustContainmentResearchSpeed(
                researchBoostPercent,
              ),
              defenseNote,
            ),
          );
        }
      }
    };
  gameContext.triggerMemeAdoptionBurst = function triggerMemeAdoptionBurst() {
    const eligibleRegionIndices = gameContext.REGION_DEFINITIONS.map(
      (regionDefinition, regionIndex) => regionIndex,
    ).filter(
      (regionIndex) =>
        gameContext.state.regions[regionIndex].a > 0.005 &&
        !gameContext.state.regions[regionIndex].restricted,
    );
    if (!eligibleRegionIndices.length) return;
    const burstRegionIndex = gameContext.pickRandomItem(eligibleRegionIndices);
    const regionState = gameContext.state.regions[burstRegionIndex];
    gameContext.recordPeakAdoption();
    regionState.a = gameContext.clamp(
      regionState.a + 0.05 * (1 - regionState.a),
      0,
      1,
    );
    gameContext.recordPeakAdoption();
    gameContext.pulseRegion(burstRegionIndex, "170,255,170");
    gameContext.enqueueTickerHeadline(
      gameContext.pickRandomItem([
        "A new filter trend sweeps " +
          gameContext.REGION_DEFINITIONS[burstRegionIndex].name,
        "Everyone in " +
          gameContext.REGION_DEFINITIONS[burstRegionIndex].name +
          " is a watercolor this week",
        'Viral: "' +
          gameContext.REGION_DEFINITIONS[burstRegionIndex].shortName +
          ' grandma discovers image playground"',
      ]),
    );
  };
  gameContext.adjustContainmentSilently = function adjustContainmentSilently(
    containmentDelta,
  ) {
    const previousContainment = gameContext.state.contain;
    gameContext.state.contain = gameContext.clamp(
      gameContext.state.contain + containmentDelta,
      0,
      100,
    );
    gameContext.enforceContainmentFloor();
    return gameContext.state.contain - previousContainment;
  };
  gameContext.adjustRegionAdoption = (regionState, adoptionFraction) => {
    gameContext.recordPeakAdoption();
    regionState.a = gameContext.clamp(
      regionState.a +
        adoptionFraction *
          (adoptionFraction > 0 ? 1 - regionState.a : regionState.a),
      0,
      1,
    );
    gameContext.recordPeakAdoption();
  };
  gameContext.effects = {
    // Outcome text reports the change that actually landed, after difficulty scaling and every clamp, and says why
    // whenever that differs from what was asked. Nothing is capped or clipped silently.
    adjustAlarm(alarmDelta) {
      const previousAlarm = gameContext.state.alarm,
        scaledAlarmDelta =
          alarmDelta > 0
            ? alarmDelta * gameContext.getDifficultyDefinition().alarmMultiplier
            : alarmDelta;
      gameContext.state.alarm = gameContext.clamp(
        previousAlarm + scaledAlarmDelta,
        0,
        gameContext.state.flags.consent ? 92 : 100,
      );
      if (alarmDelta > 0 && gameContext.state.flags.fearsells)
        gameContext.state.pts += alarmDelta * 3;
      const actualAlarmDelta = Math.round(
          gameContext.state.alarm - previousAlarm,
        ),
        overflowAlarm =
          alarmDelta > 0
            ? scaledAlarmDelta - (gameContext.state.alarm - previousAlarm)
            : 0;
      // Alarm the cap swallows is not free: it becomes a little containment.
      if (overflowAlarm > 0.01) {
        const overflowContainmentText = gameContext
          .adjustContainmentSilently(
            overflowAlarm *
              gameContext.SIMULATION_TUNING.alarmOverflowContainmentFactor,
          )
          .toFixed(1);
        return actualAlarmDelta
          ? "Alarm " +
              gameContext.formatSignedInteger(actualAlarmDelta) +
              " (at cap: Containment +" +
              overflowContainmentText +
              ")"
          : "Alarm at cap (Containment +" + overflowContainmentText + ")";
      }
      if (alarmDelta < 0 && previousAlarm + scaledAlarmDelta < 0)
        return actualAlarmDelta
          ? "Alarm " +
              gameContext.formatSignedInteger(actualAlarmDelta) +
              " (already at 0)"
          : "Alarm already at 0";
      return "Alarm " + gameContext.formatSignedInteger(actualAlarmDelta);
    },
    // Research boosts add up rather than compound, inside [0.5, 3].
    adjustContainmentResearchSpeed(researchSpeedDeltaPercent) {
      const previousResearchMultiplier = gameContext.state.cboost || 1,
        researchMultiplierDelta =
          (researchSpeedDeltaPercent > 0
            ? researchSpeedDeltaPercent * 0.65
            : researchSpeedDeltaPercent) / 100;
      gameContext.state.cboost = gameContext.clamp(
        previousResearchMultiplier + researchMultiplierDelta,
        gameContext.SIMULATION_TUNING.containmentResearchMultiplierMinimum,
        gameContext.SIMULATION_TUNING.containmentResearchMultiplierMaximum,
      );
      const displayedResearchChangePercent = Math.round(
        researchSpeedDeltaPercent > 0
          ? researchSpeedDeltaPercent * 0.65
          : -researchSpeedDeltaPercent,
      );
      return (
        "Containment research " +
        displayedResearchChangePercent +
        "% " +
        (researchSpeedDeltaPercent > 0 ? "faster" : "slower") +
        (Math.abs(
          gameContext.state.cboost -
            previousResearchMultiplier -
            researchMultiplierDelta,
        ) > 1e-9
          ? " (at its limit)"
          : "")
      );
    },
    adjustContainment(containmentDelta) {
      const previousContainment = gameContext.state.contain,
        actualContainmentDelta =
          gameContext.adjustContainmentSilently(containmentDelta);
      if (
        actualContainmentDelta >= 10 &&
        !gameContext.ui.modal &&
        !gameContext.ui.actionInProgress
      )
        gameContext.state.brief.urgent = true;
      const roundedContainmentDelta = Math.round(actualContainmentDelta);
      if (
        containmentDelta >= 0 ||
        Math.abs(actualContainmentDelta - containmentDelta) < 0.01
      )
        return (
          "Containment " +
          gameContext.formatSignedInteger(roundedContainmentDelta)
        );
      if (gameContext.state.contain > 0)
        return roundedContainmentDelta
          ? "Containment " +
              gameContext.formatSignedInteger(roundedContainmentDelta) +
              " (held by the standing committee)"
          : "Containment held by the standing committee";
      return roundedContainmentDelta
        ? "Containment " +
            gameContext.formatSignedInteger(roundedContainmentDelta) +
            " (already at 0)"
        : "Containment already at 0";
    },
    adjustCompute(computeDelta) {
      const previousCompute = gameContext.state.pts;
      gameContext.state.pts = Math.max(0, gameContext.state.pts + computeDelta);
      const actualComputeDelta = Math.round(
        gameContext.state.pts - previousCompute,
      );
      return (
        "Compute " +
        gameContext.formatSignedInteger(actualComputeDelta) +
        (actualComputeDelta > Math.round(computeDelta) ? " (all you had)" : "")
      );
    },
    adjustAdoptionInRegions(regionIds, adoptionFraction) {
      for (const regionId of regionIds) {
        const regionIndex = gameContext.REGION_INDEX_BY_ID[regionId];
        gameContext.adjustRegionAdoption(
          gameContext.state.regions[regionIndex],
          adoptionFraction,
        );
        gameContext.pulseRegion(
          regionIndex,
          adoptionFraction > 0 ? null : "255,48,64",
        );
      }
      gameContext.ui.dirty = true;
      return (
        "Adoption " +
        gameContext.formatSignedInteger(adoptionFraction * 100) +
        "% in " +
        (regionIds.label ||
          regionIds
            .map(
              (regionId) =>
                gameContext.REGION_DEFINITIONS[
                  gameContext.REGION_INDEX_BY_ID[regionId]
                ].shortName,
            )
            .join(", "))
      );
    },
    adjustGlobalAdoption(adoptionFraction) {
      for (const regionState of gameContext.state.regions)
        gameContext.adjustRegionAdoption(regionState, adoptionFraction);
      for (
        let regionIndex = 0;
        regionIndex < gameContext.REGION_DEFINITIONS.length;
        regionIndex++
      )
        gameContext.pulseRegion(regionIndex);
      gameContext.ui.dirty = true;
      return (
        "Adoption " +
        gameContext.formatSignedInteger(adoptionFraction * 100) +
        "% worldwide"
      );
    },
    restrictRegion(regionId) {
      const regionIndex = gameContext.REGION_INDEX_BY_ID[regionId],
        regionState = gameContext.state.regions[regionIndex];
      if (gameContext.isRegionRestrictionImmune(regionIndex))
        return gameContext.REGION_DEFINITIONS[regionIndex].name + " stays open";
      if (!regionState.restricted) gameContext.state.stats.restrictions++;
      regionState.restricted = true;
      regionState.holdUntil =
        gameContext.state.t +
        gameContext.SIMULATION_TUNING.restrictionHoldSeconds;
      gameContext.ui.dirty = true;
      return gameContext.REGION_DEFINITIONS[regionIndex].name + " restricted";
    },
    applyTemporaryEffect(temporaryEffectId, durationSeconds) {
      gameContext.state.temp[temporaryEffectId] =
        gameContext.state.t + durationSeconds;
      return {
        brownout: "Compute −40% for " + durationSeconds + "s",
        rival: "Spread halved for " + durationSeconds + "s",
        warden: "Containment ×1.5 for " + durationSeconds + "s",
        freeze: "Containment stalled for " + durationSeconds + "s",
        reorg: "Containment regrouping for " + durationSeconds + "s",
      }[temporaryEffectId];
    },
    allyRegion(regionId) {
      const regionIndex = gameContext.REGION_INDEX_BY_ID[regionId],
        regionState = gameContext.state.regions[regionIndex];
      regionState.allied = true;
      regionState.restricted = false;
      gameContext.pulseRegion(regionIndex, "170,255,170");
      gameContext.ui.dirty = true;
      return gameContext.REGION_DEFINITIONS[regionIndex].name + " allied";
    },
  };
  gameContext.pickRandomRegionIds = function pickRandomRegionIds(
    requestedRegionCount,
  ) {
    const adoptedRegionDefinitions = gameContext.REGION_DEFINITIONS.filter(
      (regionDefinition, regionIndex) =>
        gameContext.state.regions[regionIndex].a > 0.005,
    );
    const regionPool = (
      adoptedRegionDefinitions.length >= requestedRegionCount
        ? adoptedRegionDefinitions
        : gameContext.REGION_DEFINITIONS
    ).slice();
    const selectedRegionIds: RegionId[] = [];
    while (selectedRegionIds.length < requestedRegionCount && regionPool.length)
      selectedRegionIds.push(
        regionPool.splice(Math.floor(Math.random() * regionPool.length), 1)[0]
          .id,
      );
    return selectedRegionIds;
  };
}
