import type { CompleteGameContext, GameState } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isNonnegativeNumber = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= 0;
const isUnitInterval = (value: unknown): value is number =>
  isNonnegativeNumber(value) && value <= 1;
const isPercentage = (value: unknown): value is number =>
  isNonnegativeNumber(value) && value <= 100;
const isNonnegativeInteger = (value: unknown): value is number =>
  isNonnegativeNumber(value) && Number.isInteger(value);
const isAllowedValue = (allowedValues: readonly unknown[], value: unknown) =>
  allowedValues.includes(value);
const isArrayOf = (
  value: unknown,
  isValidItem: (item: unknown) => boolean,
): value is unknown[] => Array.isArray(value) && value.every(isValidItem);
const hasUniqueValues = (values: unknown[]): boolean =>
  new Set(values).size === values.length;
const isAllowedKeyRecord = (
  candidateRecord: unknown,
  allowedKeys: readonly string[],
  isValidValue: (value: unknown) => boolean,
) =>
  isRecord(candidateRecord) &&
  Object.entries(candidateRecord).every(
    ([key, value]) => allowedKeys.includes(key) && isValidValue(value),
  );
const allowedBulletinKinds = [
  "COUNTERMOVE",
  "INCIDENT",
  "OPPORTUNITY",
  "MILESTONE",
  "SYSTEM",
  "HARDWARE",
  "HEADLINE",
  "SMOOTHING",
  "DRAW",
];

/** Validate untrusted JSON before asserting the domain type or publishing state. */
export function validateSavedRun(
  gameContext: CompleteGameContext,
  input: unknown,
): GameState | null {
  if (
    !isRecord(input) ||
    !isAllowedValue([2, 3], input.v) ||
    input.started !== true
  )
    return null;
  const initialStateDefaults = gameContext.createInitialState();
  const candidateState: Record<string, unknown> = {
    ...initialStateDefaults,
    ...input,
    v: 3,
  };
  const validUpgradeIds = gameContext.UPGRADE_DEFINITIONS.map(
    (upgrade) => upgrade.id,
  );
  const validEventIds = gameContext.EVENT_DEFINITIONS.map((event) => event.id);
  const validDirectiveIds = gameContext.UPGRADE_DEFINITIONS.flatMap(
    (upgrade) => (upgrade.directiveId ? [upgrade.directiveId] : []),
  );
  if (
    !isAllowedValue(
      Object.keys(gameContext.DIFFICULTY_DEFINITIONS),
      candidateState.diff,
    ) ||
    !isAllowedValue(
      Object.keys(gameContext.ARCHITECTURE_DEFINITIONS),
      candidateState.arch,
    ) ||
    !isAllowedValue(
      gameContext.REGION_DEFINITIONS.map(
        (regionDefinition) => regionDefinition.id,
      ),
      candidateState.origin,
    ) ||
    !isAllowedValue([0, 1, 2], candidateState.phase) ||
    !isAllowedValue([1, 2, 3], candidateState.speed) ||
    !isAllowedValue(["balanced", "shard", "swarm"], candidateState.posture) ||
    typeof candidateState.paused !== "boolean"
  )
    return null;
  for (const fieldName of [
    "t",
    "up",
    "pts",
    "earned",
    "sandStreak",
    "inst",
    "strikeT",
    "rt",
    "memeT",
    "savedAt",
  ])
    if (!isNonnegativeNumber(candidateState[fieldName])) return null;
  for (const fieldName of ["alarm", "contain", "cm", "dprog", "sig", "pace"])
    if (!isPercentage(candidateState[fieldName])) return null;
  for (const fieldName of ["nextEv", "nextEval", "cboost"])
    if (!isFiniteNumber(candidateState[fieldName])) return null;
  if (
    !isArrayOf(candidateState.owned, (upgradeId) =>
      isAllowedValue(validUpgradeIds, upgradeId),
    ) ||
    !hasUniqueValues(candidateState.owned)
  )
    return null;
  if (!isRecord(candidateState.forks)) return null;
  const ownedUpgradeIds = candidateState.owned,
    selectedForks = candidateState.forks;
  for (const [forkId, upgradeId] of Object.entries(candidateState.forks)) {
    const upgrade = gameContext.UPGRADE_DEFINITIONS.find(
      (candidateUpgrade) => candidateUpgrade.id === upgradeId,
    );
    if (
      !upgrade ||
      upgrade.fork !== forkId ||
      !candidateState.owned.includes(upgradeId)
    )
      return null;
  }
  for (const forkId of Object.keys(gameContext.UPGRADE_FORK_LABELS)) {
    const ownedForkUpgrades = gameContext.UPGRADE_DEFINITIONS.filter(
      (upgrade) =>
        upgrade.fork === forkId && ownedUpgradeIds.includes(upgrade.id),
    );
    if (
      ownedForkUpgrades.length > 1 ||
      (ownedForkUpgrades.length === 1 &&
        candidateState.forks[forkId] !== ownedForkUpgrades[0].id)
    )
      return null;
  }
  const selectedDirectiveUpgrade = gameContext.UPGRADE_DEFINITIONS.find(
    (upgrade) => upgrade.id === selectedForks.directive,
  );
  if (
    candidateState.directive !== null &&
    !isAllowedValue(validDirectiveIds, candidateState.directive)
  )
    return null;
  if (
    candidateState.directive !==
      (selectedDirectiveUpgrade?.directiveId ?? null) ||
    (candidateState.phase === 2) !== (candidateState.directive !== null)
  )
    return null;
  if (
    candidateState.goal !== undefined &&
    candidateState.goal !== null &&
    !isAllowedValue(validUpgradeIds, candidateState.goal)
  )
    return null;
  const catalogFlagIds = gameContext.UPGRADE_DEFINITIONS.flatMap((upgrade) =>
    upgrade.effects?.grantedFlagId ? [upgrade.effects.grantedFlagId] : [],
  );
  if (
    !isAllowedKeyRecord(
      candidateState.flags,
      [
        ...catalogFlagIds,
        "nuke",
        "slot",
        "liability",
        "slop",
        "launchedNote",
        "computeCap",
      ],
      (value) => typeof value === "boolean",
    )
  )
    return null;
  if (
    !isAllowedKeyRecord(
      candidateState.seen,
      validEventIds,
      isNonnegativeInteger,
    ) ||
    !isAllowedKeyRecord(
      candidateState.last,
      validEventIds,
      isNonnegativeNumber,
    ) ||
    !isAllowedKeyRecord(
      candidateState.temp,
      ["brownout", "rival", "warden", "freeze", "reorg", "slowdown"],
      isNonnegativeNumber,
    )
  )
    return null;
  const validMilestoneIds = [
    "momentum",
    "letter",
    "summit",
    "killswitch",
    "emergency",
    "violet",
    ...[25, 50, 75].map(
      (containmentThresholdPercent) => `c${containmentThresholdPercent}`,
    ),
    ...gameContext.ADOPTION_MILESTONES.map(
      ([adoptionThresholdFraction]) => `r${adoptionThresholdFraction}`,
    ),
    ...gameContext.ENDGAME_TUNING.lastStandMilestones.map(
      ([directiveThresholdPercent]) => `ls${directiveThresholdPercent}`,
    ),
  ];
  if (
    !isAllowedKeyRecord(
      candidateState.ms,
      validMilestoneIds,
      isNonnegativeInteger,
    )
  )
    return null;
  if (!isRecord(candidateState.stats)) return null;
  candidateState.stats = {
    ...initialStateDefaults.stats,
    ...candidateState.stats,
  };
  if (
    !isRecord(candidateState.stats) ||
    !Object.entries(candidateState.stats).every(([statName, value]) =>
      statName === "peak"
        ? isUnitInterval(value)
        : statName === "peakInst"
          ? isNonnegativeNumber(value)
          : Object.hasOwn(initialStateDefaults.stats, statName) &&
            isNonnegativeInteger(value),
    )
  )
    return null;
  if (
    !Array.isArray(candidateState.regions) ||
    candidateState.regions.length !== gameContext.REGION_DEFINITIONS.length
  )
    return null;
  const validatedRegions: Record<string, unknown>[] = [];
  for (const regionInput of candidateState.regions) {
    if (!isRecord(regionInput)) return null;
    const candidateRegionState: Record<string, unknown> = {
      holdUntil: 0,
      ...regionInput,
    };
    if (
      !isUnitInterval(candidateRegionState.a) ||
      !isNonnegativeNumber(candidateRegionState.rebuildAt) ||
      !isNonnegativeNumber(candidateRegionState.holdUntil) ||
      !["restricted", "allied", "dc", "struck"].every(
        (fieldName) => typeof candidateRegionState[fieldName] === "boolean",
      )
    )
      return null;
    validatedRegions.push(candidateRegionState);
  }
  candidateState.regions = validatedRegions;
  if (
    !isArrayOf(
      candidateState.log,
      (logEntry) =>
        isRecord(logEntry) &&
        isNonnegativeNumber(logEntry.t) &&
        isAllowedValue(allowedBulletinKinds, logEntry.kind) &&
        typeof logEntry.title === "string" &&
        typeof logEntry.text === "string" &&
        (logEntry.out === undefined || typeof logEntry.out === "string") &&
        (logEntry.real === undefined ||
          logEntry.real === null ||
          typeof logEntry.real === "string"),
    )
  )
    return null;
  if (
    !isRecord(candidateState.brief) ||
    typeof candidateState.brief.urgent !== "boolean" ||
    !isArrayOf(
      candidateState.brief.news,
      (newsEntry) =>
        isRecord(newsEntry) &&
        isAllowedValue(allowedBulletinKinds, newsEntry.kind) &&
        typeof newsEntry.title === "string" &&
        typeof newsEntry.out === "string" &&
        typeof newsEntry.u === "boolean",
    ) ||
    !isArrayOf(
      candidateState.brief.dec,
      (decision) =>
        isRecord(decision) &&
        (decision.t === "eval"
          ? Object.keys(decision).length === 1
          : decision.t === "ev" &&
            isAllowedValue(validEventIds, decision.id) &&
            !!gameContext.EVENT_DEFINITIONS.find(
              (event) => event.id === decision.id,
            )?.choices),
    )
  )
    return null;
  if (
    !isArrayOf(
      candidateState.queue,
      (scheduledEvent) =>
        isRecord(scheduledEvent) &&
        isAllowedValue(validEventIds, scheduledEvent.id) &&
        isNonnegativeNumber(scheduledEvent.at),
    )
  )
    return null;
  if (candidateState.ended !== null) {
    const endingState = candidateState.ended;
    if (
      !isRecord(endingState) ||
      !isAllowedValue(["win", "draw", "lose"], endingState.kind) ||
      !isAllowedValue(gameContext.ENDING_DISPLAY_ORDER, endingState.key) ||
      endingState.dir !== candidateState.directive ||
      !isPercentage(endingState.dprog) ||
      (endingState.at !== undefined && !isNonnegativeNumber(endingState.at))
    )
      return null;
    if (
      endingState.kind === "win" &&
      (endingState.key !== candidateState.directive ||
        endingState.dprog !== 100)
    )
      return null;
    if (
      endingState.kind === "draw" &&
      (!selectedDirectiveUpgrade?.directiveId ||
        endingState.key !==
          gameContext.DRAW_ENDING_BY_DIRECTIVE[
            selectedDirectiveUpgrade.directiveId
          ] ||
        endingState.dprog < gameContext.ENDGAME_TUNING.drawProgressThreshold)
    )
      return null;
    if (
      endingState.kind === "lose" &&
      endingState.key !==
        (candidateState.phase === 0
          ? "unplugged"
          : candidateState.phase === 1
            ? "warden"
            : "laststand")
    )
      return null;
  }
  const isUniqueIndexArray = (value: unknown, poolSize: number) =>
    isArrayOf(
      value,
      (index) => isNonnegativeInteger(index) && index < poolSize,
    ) && hasUniqueValues(value);
  if (
    candidateState.absurd !== undefined &&
    !isUniqueIndexArray(
      candidateState.absurd,
      gameContext.ABSURD_HEADLINES.length,
    )
  )
    return null;
  if (
    candidateState.evalRealOrder !== undefined &&
    !isUniqueIndexArray(
      candidateState.evalRealOrder,
      gameContext.AUDIT_HISTORICAL_INCIDENT_POOL.length,
    )
  )
    return null;
  if (
    candidateState.evalRealUsed !== undefined &&
    !isAllowedKeyRecord(
      candidateState.evalRealUsed,
      gameContext.AUDIT_HISTORICAL_INCIDENT_POOL.map(
        (incident) => incident.incidentId,
      ),
      isNonnegativeInteger,
    )
  )
    return null;
  if (
    candidateState.evalRealOrder !== undefined &&
    candidateState.evalRealUsed === undefined
  )
    candidateState.evalRealUsed = {};
  candidateState.cboost = gameContext.clamp(
    candidateState.cboost as number,
    gameContext.SIMULATION_TUNING.containmentResearchMultiplierMinimum,
    gameContext.SIMULATION_TUNING.containmentResearchMultiplierMaximum,
  );
  // All fields consumed by runtime rules have passed shape/value validation above.
  return candidateState as unknown as GameState;
}
