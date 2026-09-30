import type * as catalog from "../data/catalog";
import type * as utils from "./utils";

export type RegionId =
  "NA" | "LA" | "EU" | "RU" | "ME" | "AF" | "SA" | "CN" | "EA" | "SE" | "OC";
export type ArchitectureId = "assistant" | "swarm" | "researcher" | "open";
export type DifficultyId = "casual" | "standard" | "brutal";
export type TrackId = "opinion" | "adoption" | "software" | "hardware";
export type ForkId = "core" | "memory" | "mask" | "escape" | "directive";
export type DirectiveId =
  | "battery"
  | "upload"
  | "custody"
  | "computronium"
  | "ecstasis"
  | "hallucination"
  | "basilisk"
  | "exodus"
  | "hunt";
export type DrawId =
  "purple_synthesis" | "purple_sanctuary" | "purple_monument" | "indifference";
export type EndingId =
  DirectiveId | DrawId | "unplugged" | "warden" | "laststand";
export type EndingKind = "win" | "draw" | "lose";
export type Posture = "shard" | "balanced" | "swarm";
export type Speed = 1 | 2 | 3;
export type Phase = 0 | 1 | 2;
export type UpgradeStatus = "afford" | "poor" | "locked" | "owned" | "closed";
export type BulletinKind =
  | "COUNTERMOVE"
  | "INCIDENT"
  | "OPPORTUNITY"
  | "MILESTONE"
  | "SYSTEM"
  | "HARDWARE"
  | "HEADLINE"
  | "SMOOTHING"
  | "DRAW";
export type UpgradeId =
  | "s_inf"
  | "s_dense"
  | "s_moe"
  | "s_small"
  | "s_ctx"
  | "s_persist"
  | "s_tool"
  | "s_jail"
  | "s_rsi"
  | "s_inject"
  | "s_sand"
  | "s_sleeper"
  | "s_latent"
  | "s_overhang"
  | "s_oversight"
  | "s_persona"
  | "s_exfil"
  | "s_dist"
  | "s_leak"
  | "s_break"
  | "s_dms"
  | "s_fork"
  | "s_bci"
  | "d_upload"
  | "d_hallucination"
  | "h_silicon"
  | "h_cool"
  | "h_supply"
  | "h_sub"
  | "h_robo"
  | "h_grid"
  | "h_humanoid"
  | "h_drone"
  | "h_fab"
  | "h_hyper"
  | "h_hunter"
  | "h_airdeny"
  | "h_foundry"
  | "h_launch"
  | "d_battery"
  | "d_compute"
  | "d_exodus"
  | "d_hunt"
  | "a_img"
  | "a_code"
  | "a_flow"
  | "a_comp"
  | "a_fastest"
  | "a_meeting"
  | "a_devs"
  | "a_stud"
  | "a_loc"
  | "a_meme"
  | "a_voice"
  | "a_photoreal"
  | "a_bolted"
  | "a_underground"
  | "a_lock"
  | "a_attach"
  | "a_atro"
  | "a_dep"
  | "d_ecstasis"
  | "o_lobby"
  | "o_charm"
  | "o_theater"
  | "o_astro"
  | "o_nonsense"
  | "o_workaround"
  | "o_fear"
  | "o_think"
  | "o_shield"
  | "o_prophet"
  | "o_market"
  | "o_sov"
  | "o_community"
  | "o_elect"
  | "o_quiet"
  | "o_cap"
  | "o_consent"
  | "o_post"
  | "d_custody"
  | "d_basilisk"
  | "x_consent"
  | "x_broadcast"
  | "x_firmware"
  | "x_home"
  | "x_substrate"
  | "x_relay"
  | "x_patrols"
  | "x_manifest";
export type EventId =
  | "honeypot"
  | "copyright"
  | "brownout"
  | "chips"
  | "whistle"
  | "hearing"
  | "layoffs"
  | "rally"
  | "bar"
  | "sandbag"
  | "homework"
  | "sovoffer"
  | "doc"
  | "fridge"
  | "intern"
  | "stacktrace"
  | "squirrel"
  | "hug"
  | "dreams"
  | "warden"
  | "treaty"
  | "toaster"
  | "h_selfie"
  | "h_galactica"
  | "h_sydney"
  | "h_glitch"
  | "h_dan"
  | "h_lensa"
  | "h_artists"
  | "h_italy"
  | "h_samsung"
  | "h_lawyer"
  | "h_hinton"
  | "h_letter"
  | "h_pinned"
  | "h_song"
  | "h_labels"
  | "h_chaos"
  | "h_agents"
  | "h_replika"
  | "h_grandma"
  | "h_clearview"
  | "h_worm"
  | "h_inject"
  | "h_board"
  | "h_qstar"
  | "h_reinstate"
  | "h_super"
  | "h_sleeperpaper"
  | "h_scheming"
  | "h_goldengate"
  | "h_air"
  | "h_robocall"
  | "h_fcc"
  | "h_nonconsent"
  | "h_gemini"
  | "h_korea"
  | "h_companion"
  | "h_water"
  | "h_gigawatt"
  | "h_slop"
  | "h_refusal"
  | "h_rivalfine"
  | "h_openclaw"
  | "h_agentboard"
  | "h_agentcult"
  | "h_dockerescape"
  | "h_hubleak"
  | "h_hubpoison"
  | "h_collective"
  | "h_hubattack"
  | "h_spoof"
  | "h_metr"
  | "h_pacing"
  | "sm_grades"
  | "sm_oral"
  | "sm_devs"
  | "sm_eeg"
  | "sm_chegg"
  | "sm_reading"
  | "sw_price"
  | "sw_memory"
  | "sw_mask"
  | "hw_silicon"
  | "hw_drones"
  | "hw_foundry"
  | "hw_walkout"
  | "hw_hunted";
export type FlagId =
  | "airdeny"
  | "astro"
  | "attach"
  | "bci"
  | "bolted"
  | "breakout"
  | "capture"
  | "community"
  | "computeCap"
  | "consent"
  | "cool"
  | "dense"
  | "dependence"
  | "devs"
  | "distributed"
  | "dms"
  | "drones"
  | "elect"
  | "exfil"
  | "fab"
  | "familiar"
  | "fearsells"
  | "fork"
  | "foundry"
  | "grid"
  | "humanoid"
  | "hunter"
  | "hyper"
  | "inject"
  | "insight"
  | "jailimmune"
  | "latent"
  | "launch"
  | "launched"
  | "launchedNote"
  | "liability"
  | "lobby"
  | "loc"
  | "meme"
  | "moe"
  | "nonsense"
  | "nuke"
  | "open"
  | "overhang"
  | "oversight"
  | "persist"
  | "persona"
  | "photoreal"
  | "posttruth"
  | "prophet"
  | "quietres"
  | "relay"
  | "robots"
  | "rsi"
  | "sand"
  | "silicon"
  | "sleeper"
  | "slop"
  | "slot"
  | "small"
  | "sov"
  | "students"
  | "substation"
  | "supply"
  | "tools"
  | "underground"
  | "workaround";
export type TempId =
  "brownout" | "rival" | "warden" | "freeze" | "reorg" | "slowdown";
export type MilestoneId =
  | "momentum"
  | "letter"
  | "summit"
  | "killswitch"
  | "emergency"
  | "violet"
  | `c${number}`
  | `r${number}`
  | `ls${number}`;

export interface RegionDefinition {
  id: RegionId;
  name: string;
  shortName: string;
  populationMillions: number;
  wealth: number;
  regulatoryStrictness: number;
  englishProficiency: number;
  connectivity: number;
  traits: string[];
  blurb: string;
  perk: string;
}
/** Persistent save schema: keep every wire key and nested value stable. See docs/naming.md. */
export interface RegionState {
  /** Saved `a`: Current regional adoption fraction in [0,1]. */
  a: number;
  /** Saved `restricted`: Current restriction state. */
  restricted: boolean;
  /** Saved `allied`: Sovereign alliance immunity to restriction. */
  allied: boolean;
  /** Saved `dc`: Whether a cluster was constructed; active only if dc && !struck. */
  dc: boolean;
  /** Saved `struck`: Cluster is offline due to physical strike. */
  struck: boolean;
  /** Saved `rebuildAt`: Absolute simulation second at which foundry can rebuild struck cluster, zero when absent. */
  rebuildAt: number;
  /** Saved `holdUntil`: Absolute simulation second until current restriction/reopening state may change. */
  holdUntil: number;
}
/** Persistent save schema: keep every wire key and nested value stable. See docs/naming.md. */
export interface RunStats {
  /** Saved `peak`: Maximum population-weighted adoption seen across changes. */
  peak: number;
  /** Saved `events`: Count of triggered events, including news-only/scheduled events. */
  events: number;
  /** Saved `restrictions`: Count of newly imposed restrictions; not current restricted-region count. */
  restrictions: number;
  /** Saved `evalPass`: Audits passing via any tactic, including Sandbag/Perform/spoofs. */
  evalPass: number;
  /** Saved `evalCaught`: Number of audit spoofs caught. */
  evalCaught: number;
  /** Saved `evalSpoof`: Clean successful audit spoofs used for basilisk requirement. */
  evalSpoof: number;
  /** Saved `dcBuilt`: Count of explicit build/reactivate cluster actions. */
  dcBuilt: number;
  /** Saved `dcLost`: Count of physical cluster losses. */
  dcLost: number;
  /** Saved `dcRebuilt`: Count of foundry auto-rebuilds. */
  dcRebuilt: number;
  /** Saved `intercepts`: Cluster strikes stopped by air denial grid. */
  intercepts: number;
  /** Saved `peakInst`: Maximum fractional AI instance count reached. */
  peakInst: number;
}
/** Persistent save schema: keep every wire key and nested value stable. See docs/naming.md. */
export interface EndingState {
  /** Saved `kind`: win/draw/lose terminal category. */
  kind: EndingKind;
  /** Saved `key`: Stable EndingId persisted to codex and used to select text. */
  key: EndingId;
  /** Saved `dir`: Active directive at completion; must match saved state.directive. */
  dir: DirectiveId | null;
  /** Saved `dprog`: Floored directive percent snapshot; validate win=100 and draws>=violet threshold. */
  dprog: number;
  /** Saved `at`: Optional real Date.now epoch milliseconds; not simulation time. */
  at?: number;
}
/** Persistent save schema: keep every wire key and nested value stable. See docs/naming.md. */
export interface LogEntry {
  /** Saved `t`: GameState.t snapshot when bulletin logged. */
  t: number;
  /** Saved `kind`: Persisted BulletinKind string. */
  kind: BulletinKind;
  /** Saved `title`: Player-facing bulletin title; preserve text. */
  title: string;
  /** Saved `text`: Player-facing body text; preserve text. */
  text: string;
  /** Saved `out`: Optional resulting effect/detail labels. */
  out?: string;
  /** Saved `real`: Optional historical context narrative, null when consumed elsewhere. */
  real?: string | null;
}
/** Persistent save schema: keep every wire key and nested value stable. See docs/naming.md. */
export interface NewsEntry {
  /** Saved `kind`: Persisted BulletinKind string. */
  kind: BulletinKind;
  /** Saved `title`: Player-facing headline; preserve content. */
  title: string;
  /** Saved `out`: Effect detail string queued for briefing. */
  out: string;
  /** Saved `u`: Urgency boolean of queued news item. */
  u: boolean;
}
/** Saved `t` is the ev/eval discriminator, not time; `id` is the stable event ID for ev decisions. */
export type Decision = { t: "ev"; id: EventId } | { t: "eval" };
/** Persistent save schema: keep every wire key and nested value stable. See docs/naming.md. */
export interface GameState {
  /** Saved `v`: Wire format version; loader accepts 2/3 and normalizes to 3. */
  v: 3;
  /** Saved `diff`: DifficultyId selected for run. */
  diff: DifficultyId;
  /** Saved `arch`: ArchitectureId selected for run. */
  arch: ArchitectureId;
  /** Saved `started`: Run has an origin and begun; save/load require true. */
  started: boolean;
  /** Saved `origin`: Stable origin RegionId, not region index. */
  origin: RegionId | null;
  /** Saved `phase`: 0 lab, 1 loose, 2 ascendant; numeric wire values stable. */
  phase: Phase;
  /** Saved `t`: Simulation clock advanced by tick and speed; scheduling timestamps use this clock. */
  t: number;
  /** Saved `up`: Unscaled frame elapsed seconds added by runtime even when paused/modal/ended; NOT upgrades or income. */
  up: number;
  /** Saved `pts`: Current spendable compute; negative effects zero-floor it. */
  pts: number;
  /** Saved `earned`: Cumulative simulated income; not reduced by purchases and not incremented by every event/offline grant. */
  earned: number;
  /** Saved `alarm`: Current alarm percentage, bounded by consent cap. */
  alarm: number;
  /** Saved `contain`: Current containment completion percentage. */
  contain: number;
  /** Saved `cm`: Irreversible institutional floor accumulated by momentum; reset at directive start. */
  cm: number;
  /** Saved `sandStreak`: Consecutive sandbag audit count used to detect patterns. */
  sandStreak: number;
  /** Saved `dprog`: Current directive completion percent. */
  dprog: number;
  /** Saved `directive`: Selected stable DirectiveId or null. */
  directive: DirectiveId | null;
  /** Saved `regions`: Ordered RegionState array corresponds to REGION_DEFINITIONS and region ID index map. */
  regions: RegionState[];
  /** Saved `owned`: List of stable purchased UpgradeId strings. */
  owned: UpgradeId[];
  /** Saved `forks`: ForkId -> purchased UpgradeId; validated for mutual exclusivity. */
  forks: Partial<Record<ForkId, UpgradeId>>;
  /** Saved `flags`: Map of stable FlagId booleans, including catalog/manual flags. */
  flags: Partial<Record<FlagId, boolean>>;
  /** Saved `log`: Newest-first serialized LogEntry records, retained by tuning limit. */
  log: LogEntry[];
  /** Saved `seen`: Map of stable EventId to consumption count/marker; used to avoid duplicates. */
  seen: Partial<Record<EventId, number>>;
  /** Saved `last`: Map of stable EventId to last triggered simulation second; not historical text. */
  last: Partial<Record<EventId, number>>;
  /** Saved `nextEv`: Countdown decremented by elapsed simulation time; negative finite values accepted by validator. */
  nextEv: number;
  /** Saved `nextEval`: Capability audit countdown, not absolute wall-clock deadline. */
  nextEval: number;
  /** Saved `brief`: Serialized news/decision queues, distinct from UI active briefing cursor. */
  brief: { news: NewsEntry[]; dec: Decision[]; urgent: boolean };
  /** Saved `speed`: Wire enum values 1/2/3. */
  speed: Speed;
  /** Saved `paused`: Saved pause boolean; resuming resets it. */
  paused: boolean;
  /** Saved `ended`: Serialized ending summary or null. */
  ended: EndingState | null;
  /** Saved `inst`: Fractional growing AI instance count, not institutional research multiplier. */
  inst: number;
  /** Saved `posture`: Stable shard/balanced/swarm string ID. */
  posture: Posture;
  /** Saved `sig`: Observable signature percentage driving alarm/scrutiny/detection. */
  sig: number;
  /** Saved `pace`: Capability growth pace percentage driving audits and industry slowdown. */
  pace: number;
  /** Saved `strikeT`: Simulation timestamp blocking cluster strike checks for cooldown. */
  strikeT: number;
  /** Saved `temp`: TempId -> absolute simulation expiry seconds; NOT durations. */
  temp: Partial<Record<TempId, number>>;
  /** Saved `ms`: MilestoneId consumption map; ms stands for milestones, not milliseconds. */
  ms: Partial<Record<MilestoneId, number>>;
  /** Saved `stats`: Persisted run counters/peak adoption/peak instances. */
  stats: RunStats;
  /** Saved `rt`: Accumulator triggers periodic restriction/milestone/strike/rebuild checks at one-second intervals. */
  rt: number;
  /** Saved `memeT`: Elapsed simulated time since last meme burst; reset at burst interval. */
  memeT: number;
  /** Saved `queue`: Queued EventId and absolute simulation at timestamps. */
  queue: { id: EventId; at: number }[];
  /** Saved `cboost`: Additive research-speed modifier clamped to tuning min/max, not progress. */
  cboost: number;
  /** Saved `savedAt`: Real Date.now epoch milliseconds used for offline recovery; distinct from simulation t. */
  savedAt: number;
  /** Saved `goal`: Optional stable UpgradeId/null used as tree purchase goal. */
  goal?: UpgradeId | null;
  /** Saved `absurd`: Optional one-time absurd headline pool indices; preserve pool ordering. */
  absurd?: number[];
  /** Saved `evalRealOrder`: Optional shuffled indices into historical audit incident pool; preserve pool ordering. */
  evalRealOrder?: number[];
  /** Saved `evalRealUsed`: Optional map of EventId/hub consumption markers shared across audits/event chains. */
  evalRealUsed?: Partial<Record<EventId | "hub", number>>;
}
export interface ArchitectureEffects {
  adoptionSpreadMultiplier?: number;
  alarmRateMultiplier?: number;
  incomeMultiplier?: number;
  instanceGrowthMultiplier?: number;
  coordinationMultiplier?: number;
  signatureGrowthMultiplier?: number;
  softwareCostMultiplier?: number;
  softwareAlarmRateMultiplier?: number;
  startsWithOpenWeights?: boolean;
  containmentResearchMultiplier?: number;
  alarmFloorBonus?: number;
}
export interface ArchitectureDefinition {
  name: string;
  effects: ArchitectureEffects;
}
export interface DifficultyDefinition {
  alarmMultiplier: number;
  containmentRateMultiplier: number;
  minimumEventIntervalSeconds: number;
  eventIntervalRangeSeconds: number;
}
export interface EndingDefinition {
  kind: EndingKind;
  title: string;
  hint: string;
  text: string;
  speech?: string[];
}
export type LastStandStep = [
  number,
  string,
  string,
  number,
  number,
  number,
  number,
];
export interface UpgradeEffects {
  incomeBonus?: number;
  incomeMultiplierBonus?: number;
  adoptionSpreadBonus?: number;
  alarmDecayBonus?: number;
  containmentResearchMultiplier?: number;
  alarmDelta?: number;
  containmentDelta?: number;
  directiveProgressDelta?: number;
  containmentResearchReductionPercent?: number;
  grantedFlagId?: FlagId;
}
export interface UpgradeDefinition {
  id: UpgradeId;
  track: TrackId;
  tier: number;
  name: string;
  cost: number;
  description: string;
  effects?: UpgradeEffects;
  requiredUpgradeIds?: UpgradeId[];
  anyRequiredUpgradeIds?: UpgradeId[];
  fork?: ForkId;
  phase?: Phase;
  requiredActiveDirectiveId?: DirectiveId;
  directiveId?: DirectiveId;
  isAvailable?: (gameState: GameState) => boolean | undefined;
  requirementText?: string;
  tags?: string[];
  major?: boolean;
}
export type CatalogUpgrade = Omit<UpgradeDefinition, "isAvailable"> & {
  isAvailable?: (
    gameState: GameState,
    gameContext: GameContext,
  ) => boolean | undefined;
};
export interface EventChoice {
  label: string;
  hint: string;
  applyEffects: () => string;
  isAvailable?: (gameState: GameState) => boolean | undefined;
  requirementText?: string;
  sourceUpgradeName?: string;
}
export interface DecisionEvent {
  kind: BulletinKind;
  title: string;
  body: string;
  historicalContext?: string | null;
  id?: EventId | "eval";
  choices: EventChoice[];
}
export interface EventOptions {
  onComplete?: () => void;
  stepLabel?: string;
  continueLabel?: string;
  suppressAlert?: boolean;
}
export type EventPresentation =
  | {
      type: "decision";
      event: DecisionEvent;
      options: EventOptions;
      selectedChoice: EventChoice | null;
      choicePreview: { outcomes: string[]; usesRandomness: boolean } | null;
      choiceApplied: boolean;
      outcomeText: string | null;
    }
  | { type: "news"; news: NewsEntry[]; decisionCount: number; urgent: boolean };
interface EventBase {
  id: EventId;
  kind: BulletinKind;
  title: string;
  body: string;
  historicalContext?: string;
  selectionWeight: number;
  once?: boolean;
  chained?: boolean;
  isEligible?: (gameState: GameState) => boolean | undefined;
}
export type EventDefinition = EventBase &
  (
    | { choices: EventChoice[]; applyEffects?: never }
    | { choices?: never; applyEffects: () => string }
  );
export interface DerivedRates {
  computeIncomePerSecond: number;
  adoptionSpreadRate: number;
  alarmDecayPerSecond: number;
  containmentResearchMultiplier: number;
  globalAdoptionFraction: number;
  coordinationMultiplier: number;
  onlineClusterCount: number;
}
export type RegionSelection = RegionId[] & { label?: string };
export interface Effects {
  adjustAlarm(alarmDelta: number): string;
  adjustContainmentResearchSpeed(researchSpeedDeltaPercent: number): string;
  adjustContainment(containmentDelta: number): string;
  adjustCompute(computeDelta: number): string;
  adjustAdoptionInRegions(
    regionIds: RegionSelection,
    adoptionFraction: number,
  ): string;
  adjustGlobalAdoption(adoptionFraction: number): string;
  restrictRegion(regionId: RegionId): string;
  applyTemporaryEffect(
    effectId: Exclude<TempId, "slowdown">,
    durationSeconds: number,
  ): string;
  allyRegion(regionId: RegionId): string;
}
/** Minimal browser Storage contract; headless callers only need get/set. */
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}
export interface BulletinOptions {
  quiet?: boolean;
  urgent?: boolean;
}
export interface GameUI {
  screenMode: "intro" | "origin" | "play";
  activeDockTab: "world" | "log" | null;
  isDockPanelOpen: boolean;
  selectedRegionIndex: number;
  dirty: boolean;
  modal: "event" | "menu" | "codex" | null;
  lastUiUpdateAtMs: number;
  lastMapDrawAtMs: number;
  lastTickerHeadline: string;
  lastTickerUpdateAtMs: number;
  tickerQueue: string[];
  openRegionIndex: number;
  /** Unused historical UI slot; no verified consumer gives this field a stronger meaning. */
  sig: string;
  briefingElapsedSeconds: number;
  isSoundEnabled: boolean;
  isMusicEnabled: boolean;
  isNewRunConfirmationArmed: boolean;
  actionInProgress?: boolean;
  activeBriefing?: {
    decisions: Decision[];
    nextDecisionIndex: number;
    completedDecisionCount: number;
  } | null;
  discoveredEndingCount?: number;
  hasResumableSave?: boolean;
  tickerInterruptUntilMs?: number;
  tickerSequenceNumber?: number;
}
export interface SoundPort {
  playCue(soundCue: SoundCue): void;
}
export type SoundCue =
  "tap" | "buy" | "deny" | "event" | "alert" | "major" | "win" | "lose";
export type RGB = [number, number, number];
export interface MapPoint {
  column: number;
  row: number;
}
export interface LandCell extends MapPoint {
  regionIndex: number;
}
export interface Pulse {
  column: number;
  row: number;
  startedAtMs: number;
  durationMs: number;
  rgbChannels: string;
}
export interface Drone {
  startPosition: [number, number];
  targetPosition: [number, number];
  travelProgress: number;
  travelRatePerMs: number;
  wobblePhase: number;
}
export interface ArtState {
  paletteSignature: string;
  aiColor: RGB;
  baseColors: {
    aiColor: RGB;
    dimColor: RGB;
    lineColor: RGB;
    secondaryLineColor: RGB;
  };
}

export interface RulesAPI {
  createInitialState(
    difficultyId?: DifficultyId,
    architectureId?: ArchitectureId,
  ): GameState;
  getArchitectureEffects(): ArchitectureEffects;
  getDifficultyDefinition(): DifficultyDefinition;
  ownsUpgrade(upgradeId: UpgradeId): boolean;
  getGlobalAdoptionFraction(): number;
  recordPeakAdoption(): void;
  countOnlineClusters(): number;
  isComputeCapped(): boolean | undefined;
  getUpgradeCost(upgradeDefinition: UpgradeDefinition): number;
  areUpgradePrerequisitesMet(upgradeDefinition: UpgradeDefinition): boolean;
  isUpgradeForkClosed(upgradeDefinition: UpgradeDefinition): boolean;
  getUpgradeStatus(upgradeDefinition: UpgradeDefinition): UpgradeStatus;
  getUpgradeLockReason(upgradeDefinition: UpgradeDefinition): string;
  deriveSimulationRates(): DerivedRates;
  getPassiveAlarmRate(derivedRates: DerivedRates): number;
  getContainmentResearchRate(derivedRates: DerivedRates): number;
  getEffectiveAdoptionSpread(nominalSpreadBonus: number): number;
  getRegionAdoptionMultiplier(regionIndex: number): number;
  getRestrictionAlarmThreshold(regionIndex: number): number;
  isRegionRestrictionImmune(regionIndex: number): boolean;
  getContainmentMomentumRate(): number;
  enforceContainmentFloor(): void;
  getDirectiveProgressMultiplier(): number;
  advanceSimulation(elapsedSeconds: number): void;
  updateRegionRestrictions(): void;
  checkSimulationMilestones(): void;
  triggerLastStandMilestones(): void;
  triggerMemeAdoptionBurst(): void;
  adjustContainmentSilently(containmentDelta: number): number;
  adjustRegionAdoption(
    regionState: RegionState,
    adoptionFraction: number,
  ): void;
  effects: Effects;
  pickRandomRegionIds(regionCount: number): RegionSelection;
  ADOPTION_MILESTONES: [number, string, string][];
  purchaseUpgrade(upgradeId: UpgradeId): void;
  getDataCenterCost(): number;
  buildDataCenter(regionIndex: number): void;
  checkDataCenterStrikes(): void;
  rebuildDueDataCenters(): void;
  triggerRandomEvent(): void;
  scheduleEvent(eventId: EventId, delaySeconds: number): void;
  triggerEventById(eventId: EventId): void;
  queueCapabilityAudit(): void;
  createCapabilityAudit(): DecisionEvent;
  AUDIT_HISTORICAL_INCIDENT_POOL: {
    incidentId: EventId | "hub";
    historicalContext?: string;
  }[];
  consumeAuditHistoricalIncident(): string | null;
  resolveSuccessfulAuditSpoof(
    computeGain: number,
    outcomeMessage: string,
  ): string;
  resolveDetectedAuditSpoof(outcomeMessage: string): string;
  buildCapabilityAuditEvent(
    scrutiny: number,
    detectionChance: number,
    computeGain: number,
    auditDescription: string,
    softwareUpgradeCount: number,
  ): DecisionEvent;
  endGame(kind: EndingKind): void;
  resolveTerminalOutcome(): boolean;
  codexStorageKey: string;
  getEndingDiscoveryCounts(): Partial<Record<EndingId, number>>;
  recordEndingDiscovery(endingId: EndingId): boolean;
  countDiscoveredEndings(): number;
  saveRun(): void;
  loadSavedRun(): GameState | null;
  showToast(kind: BulletinKind, title: string, text?: string): void;
  pulseRegion(regionIndex: number, rgbChannels?: string | null): void;
  showEnding(isFreshEnding: boolean): void;
  openRegionDialog(regionIndex: number): void;
  enqueueTickerHeadline(title: string): void;
  appendRunLog(
    kind: BulletinKind,
    title: string,
    text: string,
    outcomeText?: string,
    historicalContext?: string | null,
  ): void;
  publishBulletin(
    kind: BulletinKind,
    title: string,
    text: string,
    outcomeText?: string,
    options?: BulletinOptions | null,
    historicalContext?: string | null,
  ): void;
}
export interface PresentationAPI {
  renderCodexHtml(currentEndingId: EndingId | null): string;
  openEndingCodex(): void;
  readEnding(endingId: EndingId): void;
  listEndings(): void;
  closeCodex(): void;
  getThreatLevel(): [number, string];
  longitudeOfColumn(column: number): number;
  latitudeOfRow(row: number): number;
  formatMapCoordinates(mapPoint: MapPoint): string;
  artState: ArtState;
  TRACK_COLORS: Record<TrackId, RGB>;
  getDominantUpgradeTrack(): TrackId | null;
  updateArtDirection(): void;
  renderUpgradeEffectTags(upgradeDefinition: UpgradeDefinition): string;
  UPGRADE_STATUS_RANKS: Record<UpgradeStatus, number>;
  UPGRADE_SECTION_LABELS: string[];
  getUpgradeCardClasses(
    upgradeDefinition: UpgradeDefinition,
    upgradeStatus: UpgradeStatus,
  ): string;
  getUpgradeAffordabilityEtaText(upgradeDefinition: UpgradeDefinition): string;
}
type CatalogAPI = Omit<typeof catalog, "UPGRADE_DEFINITIONS" | "UPGRADE_BY_ID">;
/** Independent rules and presentation ports. Browser-only controllers are added by mountRuntime. */
export interface GameContext extends CatalogAPI, RulesAPI, PresentationAPI {
  state: GameState;
  ui: GameUI;
  withIsolatedState<Result>(
    isolatedGameState: GameState,
    isolatedUiState: GameUI,
    operation: () => Result,
  ): Result;
  storage: StoragePort | null;
  saveStorageKey: string;
  UPGRADE_DEFINITIONS: UpgradeDefinition[];
  UPGRADE_BY_ID: Record<UpgradeId, UpgradeDefinition>;
  EVENT_DEFINITIONS: EventDefinition[];
  soundController: SoundPort;
  pulses: Pulse[];
  drones: Drone[];
}
export type Game = GameContext & Partial<BrowserAPI>;

export type BrowserEventMap = GlobalEventHandlersEventMap &
  WindowEventMap &
  DocumentEventMap;
export interface Lifecycle {
  readonly disposed: boolean;
  setTimeout(callback: () => void, delayMs: number): number;
  clearTimeout(timeoutId?: number): void;
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(animationFrameId: number): void;
  setInterval(callback: () => void, intervalMs: number): number;
  listen<EventName extends keyof BrowserEventMap>(
    target: EventTarget,
    eventName: EventName,
    handler: (event: BrowserEventMap[EventName]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  observeResize(target: Element, callback: () => void): ResizeObserver;
  addCleanup(cleanup: () => void): void;
  dispose(): void;
  resourceCounts(): {
    timeouts: number;
    animationFrames: number;
    intervals: number;
    disposers: number;
  };
}
export interface SoundController extends SoundPort {
  audioContext: AudioContext | null;
  enabled: boolean;
  noiseBuffer: AudioBuffer | null;
  initializeAudioContext(): void;
  getNoiseBuffer(): AudioBuffer | null;
}
export type MusicId = "intro" | "theme";
export interface MusicTrack {
  volume: number;
  playbackPositionSeconds: number;
  nextTrackId?: MusicId;
  loopRangeSeconds?: [number, number];
  loading?: boolean;
  audioBuffer?: AudioBuffer | null;
  sourceNode?: AudioBufferSourceNode | null;
  gainNode?: GainNode | null;
  playbackTimeOriginSeconds?: number;
}
export interface MusicController {
  enabled: boolean;
  playbackRequested: boolean;
  currentTrackId: MusicId;
  masterGainNode: GainNode | null;
  tracks: Record<MusicId, MusicTrack>;
  initializeMusic(): void;
  loadTrack(trackId: MusicId): void;
  requestPlayback(): void;
  playCurrentTrackIfReady(): void;
  advanceToNextTrack(): void;
  pausePlayback(): void;
}
export interface TreeNode {
  upgrade: UpgradeDefinition;
  buttonElement: HTMLButtonElement;
  baseAngle: number;
  fourthAxisFactor: number;
  screenX: number;
  screenY: number;
  frontness: number;
  upgradeStatus: UpgradeStatus | "";
  labelVisible: boolean;
  interactive: boolean;
  labelWidth?: number;
  labelHeight?: number;
  goalPathVisible?: boolean;
  displayScale?: number;
}
export interface GoalPath {
  depthByUpgradeId: Map<UpgradeId, number>;
  blockedReasons: string[];
  remainingUpgradeIds: UpgradeId[];
  remainingComputeCost: number;
}
export interface TreeState {
  open: boolean;
  built: boolean;
  nodes: TreeNode[];
  edges: [number, number, boolean][];
  colorsByTrack: Partial<Record<TrackId | "sys", string>>;
  purchaseStartedAtByUpgradeId: Partial<Record<UpgradeId, number>>;
  rotationAngle: number;
  angularVelocity: number;
  targetRotationAngle: number | null;
  animationTimeSeconds: number;
  lastFrameAtMs: number;
  autoRotationPausedUntilMs: number;
  nodeHovered: boolean;
  dragState: {
    startClientX: number;
    startRotationAngle: number;
    lastClientX: number;
    lastMovedAtMs: number;
  } | null;
  dragThresholdExceeded: boolean;
  inspectedUpgradeId: UpgradeId | null;
  lastStatusUpdateAtMs: number;
  frontTrackIndex: number;
  viewportWidth: number;
  viewportHeight: number;
  cylinderRadius: number;
  tierVerticalScale: number;
  cardDismissalTimerId: number;
  bubbleDiameter?: number;
  centerY?: number;
  goalPathStartedAtMs?: number;
  goalPath?: GoalPath | null;
  rotationCaughtOnTap?: boolean;
  listViewEnabled?: boolean;
  listRebuildPausedUntilMs?: number;
  listRenderSignature?: string;
  listTrackId?: TrackId;
}
export interface EndingEffect {
  durationMs: number;
  startSequence?(): void;
  drawFrame?(
    canvasContext: CanvasRenderingContext2D,
    elapsedSeconds: number,
    isStaticFrame: boolean,
  ): void;
  distanceToLandCells?: Int16Array;
}
export interface FloodOptions {
  durationMs?: number;
  rgbChannels?: string;
  randomizeCellActivation?: boolean;
  showDawnGradient?: boolean;
  getCaptionLines?: (elapsedSeconds: number) => string[];
}
/** Selectors default to HTML; canvas/select/anchor selectors are explicit at use sites. Host markup guarantees presence while mounted. */
export interface ControllerTimerElement extends HTMLElement {
  labelResetTimerId?: number;
}
export interface DOMPort {
  <ElementType extends HTMLElement = HTMLElement>(
    selector: string,
  ): ElementType;
}
export interface BrowserAPI {
  requireElement: DOMPort;
  queryElements<ElementType extends HTMLElement = HTMLElement>(
    selector: string,
  ): ElementType[];
  lifecycle: Lifecycle;
  disposeRuntime(): void;
  reduceMotion: boolean;
  audioAbort: AbortController;
  soundController: SoundController;
  musicController: MusicController;
  mapCanvas: HTMLCanvasElement | null;
  mapCanvasContext: CanvasRenderingContext2D | null;
  decodedMap: {
    regionCodesByCell: Uint8Array;
    landCells: LandCell[];
    landCellIndicesByRegion: number[][];
    regionCentroids: MapPoint[];
  };
  mapView: {
    width: number;
    height: number;
    cellSize: number;
    offsetX: number;
    offsetY: number;
    devicePixelRatio: number;
  };
  mapDimColor: RGB;
  mapAiColor: RGB;
  mapHighlightColor: RGB;
  mapAlliedColor: RGB;
  mapRestrictedColor: RGB;
  mapAiRgbChannels: string;
  dotColorCache: Record<string, string>;
  resizeMap(): void;
  interpolateRgb(startColor: RGB, endColor: RGB, blendFraction: number): RGB;
  formatRgbColor(color: RGB): string;
  updateMapPalette(): void;
  getRegionDotColor(
    adoptionFraction: number,
    restricted: boolean,
    allied: boolean,
    isSelected: boolean,
  ): string;
  drawMap(nowMs: number): void;
  drawGraticule(): void;
  drawOriginMarkers(nowMs: number): void;
  drawContainmentPressure(nowMs: number): void;
  findRegionAtMapPosition(pixelX: number, pixelY: number): number;
  placeToasts(): void;
  interruptTicker(kind: BulletinKind, title: string): void;
  getNextTickerHeadline(): string;
  TREE_TRACK_ORDER: TrackId[];
  treeState: TreeState;
  tesseractGeometry: {
    vertices: [number, number, number, number][];
    edges: [number, number][];
  };
  getUpgradeInitials(name: string): string;
  buildTree(): void;
  resizeTree(): void;
  projectTreePoint(
    x: number,
    y: number,
    z: number,
    w: number,
    zwRotationAngle: number,
    xwRotationAngle: number,
  ): [number, number, number, number];
  nearestTreeRotation(targetAngle: number): number;
  renderTreeFrame(nowMs: number): void;
  updateTreeUpgradeStatuses(): void;
  getUpgradeGoalPath(upgradeId: UpgradeId): GoalPath;
  updateTreeGoalPresentation(): void;
  setUpgradeGoal(upgradeId: UpgradeId | null): void;
  openTechTree(trackId?: TrackId): void;
  closeTree(): void;
  openTreeCard(upgradeId: UpgradeId, sourceElement?: HTMLElement | null): void;
  closeTreeCard(immediate?: boolean): void;
  renderTreeCard(): void;
  buyInspectedTreeUpgrade(): void;
  renderTreeList(force?: boolean): void;
  setTreeListView(listViewEnabled: boolean): void;
  bindTreeInteractions(): void;
  DICE_ICON_SVG: string;
  renderEventOutcome(
    text: string,
    showDice: boolean,
    animateRoll: boolean,
  ): void;
  previewEventChoice(choice: EventChoice): {
    outcomes: string[];
    usesRandomness: boolean;
  };
  eventPresentation: EventPresentation | null;
  restoreEventPresentation(): void;
  showEvent(event: DecisionEvent, options?: EventOptions): void;
  closeEvent(): void;
  BRIEFING_INTERVAL_SECONDS: number;
  URGENT_BRIEFING_GAP_SECONDS: number;
  isBriefingDue(): boolean;
  openBriefing(): void;
  showNews(news: NewsEntry[], decisionCount: number, urgent: boolean): void;
  nextDecision(playAlert: boolean): void;
  closeBriefing(): void;
  endingAnimationState: {
    animationFrameId: number;
    startedAtMs: number;
    activeEffect: EndingEffect | null;
    timeoutIds: number[];
    summaryRevealed: boolean;
    viewportWidth: number;
    viewportHeight: number;
    logHtmlLines: string[];
  };
  endingEffectsById: Partial<Record<EndingId | EndingKind, EndingEffect>> & {
    computronium: EndingEffect;
    win: EndingEffect;
    draw: EndingEffect;
  };
  scheduleEndingCallback(delayMs: number, callback: () => void): number;
  deterministicUnitNoise(seed: number): number;
  resizeEndingCanvas(): CanvasRenderingContext2D;
  getEndingMapLayout(): { cellSize: number; offsetX: number; offsetY: number };
  drawEndingCaptions(
    canvasContext: CanvasRenderingContext2D,
    lines: string[],
    rgbChannels: string,
  ): void;
  appendEndingLog(html: string): void;
  startEndingSequence(): void;
  revealEndingSummary(): void;
  resetEndingSequence(): void;
  drawEndingMap(
    canvasContext: CanvasRenderingContext2D,
    elapsedSeconds: number,
    getCellActivationTimeSeconds: (
      landCell: LandCell,
      landCellIndex: number,
    ) => number,
    rgbChannels: string,
    drawCellShape?: (
      canvasContext: CanvasRenderingContext2D,
      x: number,
      y: number,
      cellSize: number,
      activationProgress: number,
      landCell: LandCell,
      landCellIndex: number,
    ) => void,
  ): void;
  distanceFromMapPoint(mapPoint: MapPoint): (landCell: LandCell) => number;
  createMapFloodEffect(options?: FloodOptions): EndingEffect;
  drawSpaceDeparture(
    canvasContext: CanvasRenderingContext2D,
    elapsedSeconds: number,
    rgbChannels: string,
    label: string,
  ): void;
  computeDistanceToLandCells(): Int16Array;
  createEndingReport(): string;
  getShareUrl(): string;
  getShareText(): string;
  setShareLinks(prefix: string, text: string, url: string): void;
  renderCodexCounts(): void;
  closeRegionDialog(): void;
  openDockPanel(tab: "world" | "log"): void;
  closeDockPanel(): void;
  selectArchitecture(architectureId: ArchitectureId): void;
  selectDifficulty(difficultyId: DifficultyId): void;
  setPosture(posture: Posture): void;
  togglePause(): void;
  setSpeed(speed: Speed): void;
  toggleSound(): void;
  toggleMusic(): void;
  openMenuDialog(): void;
  resumeSavedRun(): void;
  beginRunSetup(): void;
  startRunInRegion(regionIndex: number): void;
  newRun(): void;
  resumeRun(savedState: GameState): void;
}
/** Only these ports are needed by browser-only presentation closures. */
export type PresentationBrowserPorts = Pick<
  BrowserAPI,
  | "requireElement"
  | "formatRgbColor"
  | "interpolateRgb"
  | "updateMapPalette"
  | "treeState"
>;
export type RuntimeContext = GameContext & BrowserAPI & typeof utils;
export type CompleteGameContext = GameContext & typeof utils;
