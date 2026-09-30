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
  short: string;
  pop: number;
  wealth: number;
  reg: number;
  en: number;
  conn: number;
  traits: string[];
  blurb: string;
  perk: string;
}
export interface RegionState {
  a: number;
  restricted: boolean;
  allied: boolean;
  dc: boolean;
  struck: boolean;
  rebuildAt: number;
  holdUntil: number;
}
export interface RunStats {
  peak: number;
  events: number;
  restrictions: number;
  evalPass: number;
  evalCaught: number;
  evalSpoof: number;
  dcBuilt: number;
  dcLost: number;
  dcRebuilt: number;
  intercepts: number;
  peakInst: number;
}
export interface EndingState {
  kind: EndingKind;
  key: EndingId;
  dir: DirectiveId | null;
  dprog: number;
  at?: number;
}
export interface LogEntry {
  t: number;
  kind: BulletinKind;
  title: string;
  text: string;
  out?: string;
  real?: string | null;
}
export interface NewsEntry {
  kind: BulletinKind;
  title: string;
  out: string;
  u: boolean;
}
export type Decision = { t: "ev"; id: EventId } | { t: "eval" };
export interface GameState {
  v: 3;
  diff: DifficultyId;
  arch: ArchitectureId;
  started: boolean;
  origin: RegionId | null;
  phase: Phase;
  t: number;
  up: number;
  pts: number;
  earned: number;
  alarm: number;
  contain: number;
  cm: number;
  sandStreak: number;
  dprog: number;
  directive: DirectiveId | null;
  regions: RegionState[];
  owned: UpgradeId[];
  forks: Partial<Record<ForkId, UpgradeId>>;
  flags: Partial<Record<FlagId, boolean>>;
  log: LogEntry[];
  seen: Partial<Record<EventId, number>>;
  last: Partial<Record<EventId, number>>;
  nextEv: number;
  nextEval: number;
  brief: { news: NewsEntry[]; dec: Decision[]; urgent: boolean };
  speed: Speed;
  paused: boolean;
  ended: EndingState | null;
  inst: number;
  posture: Posture;
  sig: number;
  pace: number;
  strikeT: number;
  temp: Partial<Record<TempId, number>>;
  ms: Partial<Record<MilestoneId, number>>;
  stats: RunStats;
  rt: number;
  memeT: number;
  queue: { id: EventId; at: number }[];
  cboost: number;
  savedAt: number;
  goal?: UpgradeId | null;
  absurd?: number[];
  evalRealOrder?: number[];
  evalRealUsed?: Partial<Record<EventId | "hub", number>>;
}
export interface ArchitectureEffects {
  spreadMul?: number;
  alarmMul?: number;
  incMul?: number;
  instMul?: number;
  coordMul?: number;
  sigMul?: number;
  softCost?: number;
  softAlarmMul?: number;
  openStart?: boolean;
  containMul?: number;
  alarmFloorAdd?: number;
}
export interface ArchitectureDefinition {
  name: string;
  fx: ArchitectureEffects;
}
export interface DifficultyDefinition {
  alarm: number;
  contain: number;
  evMin: number;
  evRange: number;
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
  inc?: number;
  mult?: number;
  spread?: number;
  decay?: number;
  cmul?: number;
  alarm?: number;
  contain?: number;
  dprog?: number;
  cbcut?: number;
  flag?: FlagId;
}
export interface UpgradeDefinition {
  id: UpgradeId;
  track: TrackId;
  tier: number;
  name: string;
  cost: number;
  desc: string;
  fx?: UpgradeEffects;
  req?: UpgradeId[];
  reqAny?: UpgradeId[];
  fork?: ForkId;
  phase?: Phase;
  onlyDir?: DirectiveId;
  dir?: DirectiveId;
  cond?: (state: GameState) => boolean | undefined;
  need?: string;
  tags?: string[];
  major?: boolean;
}
export type CatalogUpgrade = Omit<UpgradeDefinition, "cond"> & {
  cond?: (state: GameState, game: GameContext) => boolean | undefined;
};
export interface EventChoice {
  label: string;
  hint: string;
  fx: () => string;
  cond?: (state: GameState) => boolean | undefined;
  need?: string;
  src?: string;
}
export interface DecisionEvent {
  kind: BulletinKind;
  title: string;
  body: string;
  real?: string | null;
  id?: EventId | "eval";
  choices: EventChoice[];
}
export interface EventOptions {
  onDone?: () => void;
  step?: string;
  nextLabel?: string;
  quiet?: boolean;
}
export type EventPresentation =
  | {
      type: "decision";
      event: DecisionEvent;
      options: EventOptions;
      picked: EventChoice | null;
      preview: { outs: string[]; chance: boolean } | null;
      resolved: boolean;
      out: string | null;
    }
  | { type: "news"; news: NewsEntry[]; n: number; urgent: boolean };
interface EventBase {
  id: EventId;
  kind: BulletinKind;
  title: string;
  body: string;
  real?: string;
  w: number;
  once?: boolean;
  chained?: boolean;
  cond?: (state: GameState) => boolean | undefined;
}
export type EventDefinition = EventBase &
  (
    | { choices: EventChoice[]; fx?: never }
    | { choices?: never; fx: () => string }
  );
export interface DerivedRates {
  income: number;
  spread: number;
  decay: number;
  cmul: number;
  reach: number;
  coord: number;
  nodes: number;
}
export type RegionSelection = RegionId[] & { label?: string };
export interface Effects {
  alarm(n: number): string;
  cboost(n: number): string;
  contain(n: number): string;
  pts(n: number): string;
  spread(ids: RegionSelection, f: number): string;
  all(f: number): string;
  restrict(id: RegionId): string;
  temp(k: Exclude<TempId, "slowdown">, secs: number): string;
  ally(id: RegionId): string;
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
  mode: "intro" | "origin" | "play";
  tab: "world" | "log" | null;
  sheetOpen: boolean;
  sel: number;
  dirty: boolean;
  modal: "event" | "menu" | "codex" | null;
  lastUi: number;
  lastMap: number;
  tkLast: string;
  tkT: number;
  tkQ: string[];
  region: number;
  sig: string;
  briefClock: number;
  soundOn: boolean;
  musicOn: boolean;
  newArmed: boolean;
  acting?: boolean;
  brief?: { decs: Decision[]; i: number; done: number } | null;
  codexCount?: number;
  hasSave?: boolean;
  intUntil?: number;
  wire?: number;
}
export interface SoundPort {
  play(type: SoundCue): void;
}
export type SoundCue =
  "tap" | "buy" | "deny" | "event" | "alert" | "major" | "win" | "lose";
export type RGB = [number, number, number];
export interface MapPoint {
  c: number;
  r: number;
}
export interface LandCell extends MapPoint {
  g: number;
}
export interface Pulse {
  x: number;
  y: number;
  t0: number;
  dur: number;
  color: string;
}
export interface Drone {
  a: [number, number];
  b: [number, number];
  t: number;
  v: number;
  j: number;
}
export interface ArtState {
  key: string;
  rgb: RGB;
  base: { ai: RGB; dim: RGB; line: RGB; line2: RGB };
}

export interface RulesAPI {
  freshState(diff?: DifficultyId, arch?: ArchitectureId): GameState;
  ARCHFX(): ArchitectureEffects;
  DIFF(): DifficultyDefinition;
  has(id: UpgradeId): boolean;
  reach(): number;
  recordPeak(): void;
  nodeCount(): number;
  capped(): boolean | undefined;
  costOf(u: UpgradeDefinition): number;
  reqsMet(u: UpgradeDefinition): boolean;
  forkTaken(u: UpgradeDefinition): boolean;
  status(u: UpgradeDefinition): UpgradeStatus;
  lockReason(u: UpgradeDefinition): string;
  derive(): DerivedRates;
  passiveAlarm(d: DerivedRates): number;
  cRate(d: DerivedRates): number;
  effectiveSpread(n: number): number;
  regionMod(i: number): number;
  threshold(i: number): number;
  immune(i: number): boolean;
  momentum(): number;
  floorContain(): void;
  dirMul(): number;
  tick(dt: number): void;
  checkRestrictions(): void;
  checkMilestones(): void;
  lastStand(): void;
  burst(): void;
  addContainQuiet(n: number): number;
  adopt(r: RegionState, f: number): void;
  FX: Effects;
  randIds(n: number): RegionSelection;
  REACH_MS: [number, string, string][];
  buy(id: UpgradeId): void;
  dcCost(): number;
  buildDC(i: number): void;
  checkStrikes(): void;
  checkRebuilds(): void;
  fireEvent(): void;
  schedule(id: EventId, delay: number): void;
  fireById(id: EventId): void;
  fireEval(): void;
  makeEval(): DecisionEvent;
  EVAL_REAL_POOL: { k: EventId | "hub"; t?: string }[];
  evalReal(): string | null;
  spoofWin(gain: number, msg: string): string;
  spoofLose(msg: string): string;
  buildEvalObj(
    scr: number,
    detect: number,
    gain: number,
    lvl: string,
    softCount: number,
  ): DecisionEvent;
  endGame(kind: EndingKind): void;
  resolveTerminal(): boolean;
  CODEX_KEY: string;
  codexGet(): Partial<Record<EndingId, number>>;
  codexAdd(key: EndingId): boolean;
  codexCount(): number;
  save(): void;
  load(): GameState | null;
  toast(kind: BulletinKind, title: string, text?: string): void;
  pulseRegion(i: number, color?: string | null): void;
  showEnd(fresh: boolean): void;
  openRegion(i: number): void;
  pushTicker(title: string): void;
  log(
    kind: BulletinKind,
    title: string,
    text: string,
    out?: string,
    real?: string | null,
  ): void;
  bulletin(
    kind: BulletinKind,
    title: string,
    text: string,
    out?: string,
    opt?: BulletinOptions | null,
    real?: string | null,
  ): void;
}
export interface PresentationAPI {
  codexHTML(current: EndingId | null): string;
  openCodex(): void;
  readEnding(k: EndingId): void;
  listEndings(): void;
  closeCodex(): void;
  threat(): [number, string];
  lonOf(c: number): number;
  latOf(r: number): number;
  latLon(p: MapPoint): string;
  ART: ArtState;
  TRACK_RGB: Record<TrackId, RGB>;
  buildTrack(): TrackId | null;
  artDirection(): void;
  fxTags(u: UpgradeDefinition): string;
  RANK: Record<UpgradeStatus, number>;
  SEC: string[];
  cardClass(u: UpgradeDefinition, st: UpgradeStatus): string;
  etaText(u: UpgradeDefinition): string;
}
type CatalogAPI = Omit<typeof catalog, "UPGRADES" | "UP">;
/** Independent rules and presentation ports. Browser-only controllers are added by mountRuntime. */
export interface GameContext extends CatalogAPI, RulesAPI, PresentationAPI {
  state: GameState;
  ui: GameUI;
  withIsolatedState<T>(state: GameState, ui: GameUI, run: () => T): T;
  storage: StoragePort | null;
  KEY: string;
  UPGRADES: UpgradeDefinition[];
  UP: Record<UpgradeId, UpgradeDefinition>;
  EVENTS: EventDefinition[];
  SND: SoundPort;
  pulses: Pulse[];
  drones: Drone[];
}
export type Game = GameContext & Partial<BrowserAPI>;

export type BrowserEventMap = GlobalEventHandlersEventMap &
  WindowEventMap &
  DocumentEventMap;
export interface Lifecycle {
  readonly disposed: boolean;
  later(fn: () => void, ms: number): number;
  cancelLater(id?: number): void;
  raf(fn: FrameRequestCallback): number;
  cancelRaf(id: number): void;
  every(fn: () => void, ms: number): number;
  on<K extends keyof BrowserEventMap>(
    target: EventTarget,
    event: K,
    fn: (event: BrowserEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  observe(target: Element, fn: () => void): ResizeObserver;
  add(fn: () => void): void;
  dispose(): void;
  counts(): {
    timers: number;
    frames: number;
    intervals: number;
    disposers: number;
  };
}
export interface SoundController extends SoundPort {
  ctx: AudioContext | null;
  on: boolean;
  buf: AudioBuffer | null;
  init(): void;
  noise(): AudioBuffer | null;
}
export type MusicId = "intro" | "theme";
export interface MusicTrack {
  vol: number;
  pos: number;
  then?: MusicId;
  loop?: [number, number];
  loading?: boolean;
  buf?: AudioBuffer | null;
  src?: AudioBufferSourceNode | null;
  g?: GainNode | null;
  t0?: number;
}
export interface MusicController {
  on: boolean;
  started: boolean;
  cur: MusicId;
  gain: GainNode | null;
  T: Record<MusicId, MusicTrack>;
  init(): void;
  load(k: MusicId): void;
  start(): void;
  play(): void;
  next(): void;
  stop(): void;
}
export interface TreeNode {
  u: UpgradeDefinition;
  el: HTMLButtonElement;
  phi: number;
  w: number;
  x: number;
  y: number;
  f: number;
  st: UpgradeStatus | "";
  fr: boolean;
  hit: boolean;
  lw?: number;
  lh?: number;
  pv?: boolean;
  sc?: number;
}
export interface GoalPath {
  depth: Map<UpgradeId, number>;
  blocked: string[];
  left: UpgradeId[];
  cost: number;
}
export interface TreeState {
  open: boolean;
  built: boolean;
  nodes: TreeNode[];
  edges: [number, number, boolean][];
  col: Partial<Record<TrackId | "sys", string>>;
  lit: Partial<Record<UpgradeId, number>>;
  a: number;
  va: number;
  target: number | null;
  t: number;
  last: number;
  hold: number;
  hover: boolean;
  drag: { x: number; a: number; lx: number; lt: number } | null;
  moved: boolean;
  card: UpgradeId | null;
  stT: number;
  front: number;
  W: number;
  H: number;
  R: number;
  Y: number;
  cardTm: number;
  bub?: number;
  cy?: number;
  goalT0?: number;
  gp?: GoalPath | null;
  caught?: boolean;
  list?: boolean;
  listHold?: number;
  listSig?: string;
  listTrack?: TrackId;
}
export interface EndingEffect {
  dur: number;
  start?(): void;
  draw?(g: CanvasRenderingContext2D, t: number, still: boolean): void;
  dist?: Int16Array;
}
export interface FloodOptions {
  dur?: number;
  col?: string;
  random?: boolean;
  dawn?: boolean;
  lines?: (t: number) => string[];
}
/** Selectors default to HTML; canvas/select/anchor selectors are explicit at use sites. Host markup guarantees presence while mounted. */
export interface ControllerTimerElement extends HTMLElement {
  _t?: number;
}
export interface DOMPort {
  <E extends HTMLElement = HTMLElement>(selector: string): E;
}
export interface BrowserAPI {
  $: DOMPort;
  $$<E extends HTMLElement = HTMLElement>(selector: string): E[];
  life: Lifecycle;
  disposeRuntime(): void;
  reduceMotion: boolean;
  audioAbort: AbortController;
  SND: SoundController;
  MUSIC: MusicController;
  cv: HTMLCanvasElement | null;
  cx: CanvasRenderingContext2D | null;
  MAPD: {
    cells: Uint8Array;
    land: LandCell[];
    reg: number[][];
    cent: MapPoint[];
  };
  MV: {
    w: number;
    h: number;
    cell: number;
    ox: number;
    oy: number;
    dpr: number;
  };
  C_DIM: RGB;
  C_AI: RGB;
  C_HOT: RGB;
  C_ALLY: RGB;
  C_RED: RGB;
  AI_S: string;
  colCache: Record<string, string>;
  resizeMap(): void;
  lerp(a: RGB, b: RGB, t: number): RGB;
  rgb(c: RGB): string;
  mapPalette(): void;
  dotColor(
    a: number,
    restricted: boolean,
    allied: boolean,
    sel: boolean,
  ): string;
  drawMap(now: number): void;
  drawGraticule(): void;
  drawOrigin(now: number): void;
  drawPressure(now: number): void;
  hitRegion(px: number, py: number): number;
  placeToasts(): void;
  interrupt(kind: BulletinKind, title: string): void;
  tickerText(): string;
  TREE_ORDER: TrackId[];
  TREE: TreeState;
  TESS: { v: [number, number, number, number][]; e: [number, number][] };
  treeInitials(name: string): string;
  buildTree(): void;
  sizeTree(): void;
  treeProject(
    x: number,
    y: number,
    z: number,
    w: number,
    b: number,
    c: number,
  ): [number, number, number, number];
  treeNearest(t: number): number;
  treeFrame(now: number): void;
  treeStatus(): void;
  goalPath(id: UpgradeId): GoalPath;
  treeGoal(): void;
  setGoal(id: UpgradeId | null): void;
  openTree(track?: TrackId): void;
  closeTree(): void;
  openTreeCard(id: UpgradeId, el?: HTMLElement | null): void;
  closeTreeCard(now?: boolean): void;
  renderTreeCard(): void;
  treeBuy(): void;
  renderTreeList(force?: boolean): void;
  setTreeView(list: boolean): void;
  bindTree(): void;
  DICE_SVG: string;
  setOutcome(text: string, dice: boolean, roll: boolean): void;
  previewChoice(c: EventChoice): { outs: string[]; chance: boolean };
  eventPresentation: EventPresentation | null;
  restoreEventPresentation(): void;
  showEvent(e: DecisionEvent, opt?: EventOptions): void;
  closeEvent(): void;
  BRIEF_EVERY: number;
  URGENT_GAP: number;
  briefDue(): boolean;
  openBriefing(): void;
  showNews(news: NewsEntry[], n: number, urgent: boolean): void;
  nextDecision(loud: boolean): void;
  closeBriefing(): void;
  ENDFX: {
    raf: number;
    t0: number;
    fx: EndingEffect | null;
    timers: number[];
    revealed: boolean;
    W: number;
    H: number;
    lines: string[];
  };
  END_FX: Partial<Record<EndingId | EndingKind, EndingEffect>> & {
    computronium: EndingEffect;
    win: EndingEffect;
    draw: EndingEffect;
  };
  endLater(ms: number, f: () => void): number;
  hsh(i: number): number;
  endCanvas(): CanvasRenderingContext2D;
  endMapFit(): { cell: number; ox: number; oy: number };
  endText(g: CanvasRenderingContext2D, lines: string[], col: string): void;
  endLog(html: string): void;
  endSequence(): void;
  endReveal(): void;
  endReset(): void;
  endMap(
    g: CanvasRenderingContext2D,
    t: number,
    act: (d: LandCell, i: number) => number,
    col: string,
    shape?: (
      g: CanvasRenderingContext2D,
      x: number,
      y: number,
      cell: number,
      k: number,
      d: LandCell,
      i: number,
    ) => void,
  ): void;
  distFrom(p: MapPoint): (d: LandCell) => number;
  flood(o?: FloodOptions): EndingEffect;
  drawDeparture(
    g: CanvasRenderingContext2D,
    t: number,
    col: string,
    label: string,
  ): void;
  seaDist(): Int16Array;
  report(): string;
  shareUrl(): string;
  shareText(): string;
  setShareLinks(prefix: string, text: string, url: string): void;
  renderCodexCounts(): void;
  closeRegion(): void;
  openSheet(tab: "world" | "log"): void;
  closeSheet(): void;
  selectArchitecture(a: ArchitectureId): void;
  selectDifficulty(d: DifficultyId): void;
  setPosture(p: Posture): void;
  togglePause(): void;
  setSpeed(n: Speed): void;
  toggleSound(): void;
  toggleMusic(): void;
  openMenu(): void;
  resumeSaved(): void;
  begin(): void;
  startRun(i: number): void;
  newRun(): void;
  resumeRun(saved: GameState): void;
}
/** Only these ports are needed by browser-only presentation closures. */
export type PresentationBrowserPorts = Pick<
  BrowserAPI,
  "$" | "rgb" | "lerp" | "mapPalette" | "TREE"
>;
export type RuntimeContext = GameContext & BrowserAPI & typeof utils;
export type CompleteGameContext = GameContext & typeof utils;
