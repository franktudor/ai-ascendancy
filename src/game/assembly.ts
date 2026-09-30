import type { CompleteGameContext } from "./types";
import type * as catalog from "../data/catalog";
import type * as utilities from "./utils";

export type GameAssemblySeed = Pick<
  CompleteGameContext,
  | keyof typeof catalog
  | keyof typeof utilities
  | "state"
  | "withIsolatedState"
  | "storage"
  | "saveStorageKey"
  | "ui"
  | "pulses"
  | "drones"
  | "soundController"
>;
type AssemblyMemberKind<MemberValue> = MemberValue extends (
  ...functionArguments: never[]
) => unknown
  ? "function"
  : MemberValue extends number
    ? "number"
    : MemberValue extends string
      ? "string"
      : "object";
type AssemblyMemberInventory<GameMembers> = {
  [MemberName in keyof GameMembers]: AssemblyMemberKind<
    GameMembers[MemberName]
  >;
};

// Seed data/utilities and construction-installed members are disjoint, exhaustive
// compiler-checked inventories. A default function cannot become an installer
// substitute without invalidating the installed inventory.
export const seedMemberInventory = {
  WORLD_MAP_DEFINITION: "object",
  REGION_DEFINITIONS: "object",
  TOTAL_POPULATION_MILLIONS: "number",
  REGION_INDEX_BY_ID: "object",
  UPGRADE_TRACK_DEFINITIONS: "object",
  UPGRADE_FORK_LABELS: "object",
  UPGRADE_DEFINITIONS: "object",
  UPGRADE_BY_ID: "object",
  ARCHITECTURE_DEFINITIONS: "object",
  COMPUTE_ECONOMY_TUNING: "object",
  ENDGAME_TUNING: "object",
  DIFFICULTY_DEFINITIONS: "object",
  SIMULATION_TUNING: "object",
  ENDING_DEFINITIONS: "object",
  DRAW_ENDING_BY_DIRECTIVE: "object",
  ENDING_DISPLAY_ORDER: "object",
  HEADLINES_BY_THREAT_LEVEL: "object",
  ABSURD_HEADLINES: "object",
  HEADLINES_BY_DIRECTIVE: "object",
  clamp: "function",
  FULL_TURN_RADIANS: "number",
  pickRandomItem: "function",
  formatCompactNumber: "function",
  formatElapsedTime: "function",
  escapeHtml: "function",
  getBulletinKindLabel: "function",
  joinDetailLabels: "function",
  formatSignedInteger: "function",
  state: "object",
  withIsolatedState: "function",
  storage: "object",
  saveStorageKey: "string",
  ui: "object",
  pulses: "object",
  drones: "object",
  soundController: "object",
} satisfies AssemblyMemberInventory<GameAssemblySeed>;

export type ConstructionRole =
  | "headless"
  | "installSimulation"
  | "installEventCatalog"
  | "installEvents"
  | "installEconomy"
  | "installOutcomes"
  | "installPersistence"
  | "installPresentation";

// The keyed inventory is compiler-checked when API members are added or removed.
export const installedMemberInventory = {
  createInitialState: ["function", "installSimulation"],
  getArchitectureEffects: ["function", "headless"],
  getDifficultyDefinition: ["function", "installSimulation"],
  ownsUpgrade: ["function", "installSimulation"],
  getGlobalAdoptionFraction: ["function", "installSimulation"],
  recordPeakAdoption: ["function", "installSimulation"],
  countOnlineClusters: ["function", "installSimulation"],
  isComputeCapped: ["function", "installSimulation"],
  getUpgradeCost: ["function", "installSimulation"],
  areUpgradePrerequisitesMet: ["function", "installSimulation"],
  isUpgradeForkClosed: ["function", "installSimulation"],
  getUpgradeStatus: ["function", "installSimulation"],
  getUpgradeLockReason: ["function", "installSimulation"],
  deriveSimulationRates: ["function", "installSimulation"],
  getPassiveAlarmRate: ["function", "installSimulation"],
  getContainmentResearchRate: ["function", "installSimulation"],
  getEffectiveAdoptionSpread: ["function", "installSimulation"],
  getRegionAdoptionMultiplier: ["function", "installSimulation"],
  getRestrictionAlarmThreshold: ["function", "installSimulation"],
  isRegionRestrictionImmune: ["function", "installSimulation"],
  getContainmentMomentumRate: ["function", "installSimulation"],
  enforceContainmentFloor: ["function", "installSimulation"],
  getDirectiveProgressMultiplier: ["function", "installSimulation"],
  advanceSimulation: ["function", "installSimulation"],
  updateRegionRestrictions: ["function", "installSimulation"],
  checkSimulationMilestones: ["function", "installSimulation"],
  triggerLastStandMilestones: ["function", "installSimulation"],
  triggerMemeAdoptionBurst: ["function", "installSimulation"],
  adjustContainmentSilently: ["function", "installSimulation"],
  adjustRegionAdoption: ["function", "installSimulation"],
  pickRandomRegionIds: ["function", "installSimulation"],
  purchaseUpgrade: ["function", "installEconomy"],
  getDataCenterCost: ["function", "installEconomy"],
  buildDataCenter: ["function", "installEconomy"],
  checkDataCenterStrikes: ["function", "installEconomy"],
  rebuildDueDataCenters: ["function", "installEconomy"],
  triggerRandomEvent: ["function", "installEvents"],
  scheduleEvent: ["function", "installEvents"],
  triggerEventById: ["function", "installEvents"],
  queueCapabilityAudit: ["function", "installEvents"],
  createCapabilityAudit: ["function", "installEvents"],
  consumeAuditHistoricalIncident: ["function", "installEvents"],
  resolveSuccessfulAuditSpoof: ["function", "installEvents"],
  resolveDetectedAuditSpoof: ["function", "installEvents"],
  buildCapabilityAuditEvent: ["function", "installEvents"],
  endGame: ["function", "installOutcomes"],
  resolveTerminalOutcome: ["function", "installOutcomes"],
  getEndingDiscoveryCounts: ["function", "installPersistence"],
  recordEndingDiscovery: ["function", "installPersistence"],
  countDiscoveredEndings: ["function", "installPersistence"],
  saveRun: ["function", "installPersistence"],
  loadSavedRun: ["function", "installPersistence"],
  showToast: ["function", "headless"],
  pulseRegion: ["function", "headless"],
  showEnding: ["function", "headless"],
  openRegionDialog: ["function", "headless"],
  enqueueTickerHeadline: ["function", "headless"],
  appendRunLog: ["function", "headless"],
  publishBulletin: ["function", "headless"],
  renderCodexHtml: ["function", "installPresentation"],
  openEndingCodex: ["function", "installPresentation"],
  readEnding: ["function", "installPresentation"],
  listEndings: ["function", "installPresentation"],
  closeCodex: ["function", "installPresentation"],
  getThreatLevel: ["function", "installPresentation"],
  longitudeOfColumn: ["function", "installPresentation"],
  latitudeOfRow: ["function", "installPresentation"],
  formatMapCoordinates: ["function", "installPresentation"],
  getDominantUpgradeTrack: ["function", "installPresentation"],
  updateArtDirection: ["function", "installPresentation"],
  renderUpgradeEffectTags: ["function", "installPresentation"],
  getUpgradeCardClasses: ["function", "installPresentation"],
  getUpgradeAffordabilityEtaText: ["function", "installPresentation"],
  effects: ["object", "installSimulation"],
  ADOPTION_MILESTONES: ["object", "installSimulation"],
  AUDIT_HISTORICAL_INCIDENT_POOL: ["object", "installEvents"],
  artState: ["object", "installPresentation"],
  TRACK_COLORS: ["object", "installPresentation"],
  UPGRADE_STATUS_RANKS: ["object", "installPresentation"],
  UPGRADE_SECTION_LABELS: ["object", "installPresentation"],
  codexStorageKey: ["string", "installPersistence"],
  EVENT_DEFINITIONS: ["object", "installEventCatalog"],
} satisfies {
  [
    InstalledMemberName in keyof Omit<
      CompleteGameContext,
      keyof GameAssemblySeed
    >
  ]: [
    AssemblyMemberKind<CompleteGameContext[InstalledMemberName]>,
    ConstructionRole,
  ];
};

const effectMemberInventory = {
  adjustAlarm: "function",
  adjustContainmentResearchSpeed: "function",
  adjustContainment: "function",
  adjustCompute: "function",
  adjustAdoptionInRegions: "function",
  adjustGlobalAdoption: "function",
  restrictRegion: "function",
  applyTemporaryEffect: "function",
  allyRegion: "function",
} satisfies AssemblyMemberInventory<CompleteGameContext["effects"]>;

export function assertGameAssembly(
  gameContext: CompleteGameContext,
  constructionRole?: ConstructionRole,
): void {
  for (const memberName of Object.keys(
    installedMemberInventory,
  ) as (keyof typeof installedMemberInventory)[]) {
    const [expectedKind, installerRole] = installedMemberInventory[memberName];
    if (constructionRole && installerRole !== constructionRole) continue;
    if (
      typeof gameContext[memberName] !== expectedKind ||
      gameContext[memberName] === null
    )
      throw new Error(
        `Incomplete game assembly: ${memberName} requires ${expectedKind}`,
      );
  }
  if (!constructionRole) {
    for (const seedMemberName of Object.keys(
      seedMemberInventory,
    ) as (keyof GameAssemblySeed)[]) {
      if (seedMemberName === "storage" && gameContext[seedMemberName] === null)
        continue;
      if (
        typeof gameContext[seedMemberName] !==
          seedMemberInventory[seedMemberName] ||
        gameContext[seedMemberName] === null
      )
        throw new Error(
          `Incomplete game assembly: ${seedMemberName} requires ${seedMemberInventory[seedMemberName]}`,
        );
    }
    if (typeof gameContext.soundController.playCue !== "function")
      throw new Error(
        "Incomplete game assembly: soundController.playCue requires function",
      );
  }
  if (!constructionRole || constructionRole === "installSimulation")
    for (const effectMemberName of Object.keys(
      effectMemberInventory,
    ) as (keyof typeof effectMemberInventory)[])
      if (typeof gameContext.effects[effectMemberName] !== "function")
        throw new Error(
          `Incomplete game assembly: effects.${effectMemberName} requires function`,
        );
}
