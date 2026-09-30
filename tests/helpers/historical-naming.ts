import assert from "node:assert/strict";
import type {
  RegionId,
  UpgradeId,
  FlagId,
  TrackId,
  Phase,
  ForkId,
  DirectiveId,
  GameState,
  BulletinKind,
  EventId,
  TempId,
  RegionSelection,
  Decision,
  SoundCue,
  ArchitectureId,
  DifficultyId,
  EndingId,
  EndingKind,
  EndingDefinition,
  BulletinOptions,
  CompleteGameContext,
  RuntimeContext,
  RegionDefinition,
  UpgradeDefinition,
  UpgradeEffects,
  EventChoice,
  DecisionEvent,
  EventDefinition,
  EventOptions,
  DerivedRates,
  Effects,
  GameUI,
} from "../../src/game/types";

// Independent historical schema. These keys describe the pinned VM, not the
// migrated catalogs. Only the stable save/ID types are shared with production.
export interface HistoricalRegionDefinition {
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
export interface HistoricalArchitectureEffects {
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
export interface HistoricalArchitectureDefinition {
  name: string;
  fx: HistoricalArchitectureEffects;
}
export interface HistoricalDifficultyDefinition {
  alarm: number;
  contain: number;
  evMin: number;
  evRange: number;
}
export interface HistoricalUpgradeEffects {
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
export interface HistoricalUpgradeDefinition {
  id: UpgradeId;
  track: TrackId;
  tier: number;
  name: string;
  cost: number;
  desc: string;
  fx?: HistoricalUpgradeEffects;
  req?: UpgradeId[];
  reqAny?: UpgradeId[];
  fork?: ForkId;
  phase?: Phase;
  onlyDir?: DirectiveId;
  dir?: DirectiveId;
  cond?: (conditionState: GameState) => boolean | undefined;
  need?: string;
  tags?: string[];
  major?: boolean;
}
export interface HistoricalEventChoice {
  label: string;
  hint: string;
  fx: () => string;
  cond?: (conditionState: GameState) => boolean | undefined;
  need?: string;
  src?: string;
}
export interface HistoricalDecisionEvent {
  kind: BulletinKind;
  title: string;
  body: string;
  real?: string | null;
  id?: EventId | "eval";
  choices: HistoricalEventChoice[];
}
export interface HistoricalEventOptions {
  onDone?: () => void;
  step?: string;
  nextLabel?: string;
  quiet?: boolean;
}
export interface HistoricalEventBase {
  id: EventId;
  kind: BulletinKind;
  title: string;
  body: string;
  real?: string;
  w: number;
  once?: boolean;
  chained?: boolean;
  cond?: (conditionState: GameState) => boolean | undefined;
}
export type HistoricalEventDefinition = HistoricalEventBase &
  (
    | { choices: HistoricalEventChoice[]; fx?: never }
    | { choices?: never; fx: () => string }
  );
export interface HistoricalDerivedRates {
  income: number;
  spread: number;
  decay: number;
  cmul: number;
  reach: number;
  coord: number;
  nodes: number;
}
export interface HistoricalEffects {
  alarm(alarmDelta: number): string;
  cboost(containmentResearchMultiplier: number): string;
  contain(containmentDelta: number): string;
  pts(computeDelta: number): string;
  spread(regionSelection: RegionSelection, adoptionDelta: number): string;
  all(adoptionDelta: number): string;
  restrict(regionId: RegionId): string;
  temp(
    temporaryEffectId: Exclude<TempId, "slowdown">,
    durationSeconds: number,
  ): string;
  ally(regionId: RegionId): string;
}
export interface HistoricalGameUI {
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
export interface HistoricalSoundPort {
  play(soundCue: SoundCue): void;
}
export interface HistoricalRulePort {
  state: GameState;
  ui: HistoricalGameUI;
  freshState(
    difficultyId?: DifficultyId,
    architectureId?: ArchitectureId,
  ): GameState;
  tick(elapsedSeconds: number): void;
  derive(): HistoricalDerivedRates;
  costOf(historicalUpgrade: HistoricalUpgradeDefinition): number;
  status(
    historicalUpgrade: HistoricalUpgradeDefinition,
  ): "owned" | "closed" | "locked" | "afford" | "poor";
  lockReason(historicalUpgrade: HistoricalUpgradeDefinition): string;
  UPGRADES: HistoricalUpgradeDefinition[];
  UP: Record<UpgradeId, HistoricalUpgradeDefinition>;
  EVENTS: HistoricalEventDefinition[];
  ENDINGS: Record<EndingId, EndingDefinition>;
  DRAWS: Record<DirectiveId, EndingId>;
  REGIONS: HistoricalRegionDefinition[];
  FX: HistoricalEffects;
  buy(upgradeId: UpgradeId): void;
  buildDC(regionIndex: number): void;
  checkStrikes(): void;
  checkRebuilds(): void;
  endGame(endingKind: EndingKind): void;
  makeEval(): HistoricalDecisionEvent;
  fireEval(): void;
  fireEvent(): void;
  fireById(eventId: EventId): void;
  schedule(eventId: EventId, delaySeconds: number): void;
  evalReal(): string | null;
  buildEvalObj(
    scrutinyLevel: number,
    detectionChance: number,
    computeGain: number,
    scrutinyLabel: string,
    softwareUpgradeCount: number,
  ): HistoricalDecisionEvent;
  reach(): number;
  log(
    bulletinKind: BulletinKind,
    title: string,
    bodyText: string,
    outcomeText?: string,
    historicalContext?: string | null,
  ): void;
  bulletin(
    bulletinKind: BulletinKind,
    title: string,
    bodyText: string,
    outcomeText?: string,
    bulletinOptions?: BulletinOptions | null,
    historicalContext?: string | null,
  ): void;
  checkRestrictions(): void;
  checkMilestones(): void;
  burst(): void;
  startRun(regionIndex: number): void;
  previewChoice(historicalChoice: HistoricalEventChoice): {
    outs: string[];
    chance: boolean;
  };
  showEvent(
    historicalDecisionEvent: HistoricalDecisionEvent,
    historicalEventOptions?: HistoricalEventOptions,
  ): void;
  nextDecision(playAlert: boolean): void;
  save(): void;
  load(): GameState | null;
  codexGet(): Partial<Record<EndingId, number>>;
}

type SchemaFieldNameMap<
  HistoricalSchema extends object,
  CurrentSchema extends object,
> = {
  [HistoricalFieldKey in keyof HistoricalSchema]-?: keyof CurrentSchema;
};
/** Translate keys only. Preserve optional presence, values and callable closures. */
function translateHistoricalFields<
  HistoricalSchema extends object,
  CurrentSchema extends object,
>(
  historicalValue: HistoricalSchema,
  fieldNameMap: SchemaFieldNameMap<HistoricalSchema, CurrentSchema>,
): CurrentSchema {
  const translatedFieldValues: Record<string, unknown> = {};
  for (const historicalFieldKey of Object.keys(
    historicalValue,
  ) as (keyof HistoricalSchema)[]) {
    assert.ok(
      Object.hasOwn(fieldNameMap, historicalFieldKey),
      `Unmapped historical field: ${String(historicalFieldKey)}`,
    );
    const currentFieldKey = fieldNameMap[historicalFieldKey];
    assert.ok(
      !Object.hasOwn(translatedFieldValues, currentFieldKey),
      `Duplicate historical mapping: ${String(currentFieldKey)}`,
    );
    translatedFieldValues[String(currentFieldKey)] =
      historicalValue[historicalFieldKey];
  }
  // Only this checked schema-translation boundary crosses an untyped object.
  const adaptedValue = translatedFieldValues as CurrentSchema;
  assert.equal(
    Object.keys(adaptedValue).length,
    Object.keys(historicalValue).length,
    "historical mapping cannot drop fields",
  );
  return adaptedValue;
}
export const historicalRegionDefinitionNames = {
  id: "id",
  name: "name",
  short: "shortName",
  pop: "populationMillions",
  wealth: "wealth",
  reg: "regulatoryStrictness",
  en: "englishProficiency",
  conn: "connectivity",
  traits: "traits",
  blurb: "blurb",
  perk: "perk",
} satisfies SchemaFieldNameMap<HistoricalRegionDefinition, RegionDefinition>;
export const historicalUpgradeEffectsNames = {
  inc: "incomeBonus",
  mult: "incomeMultiplierBonus",
  spread: "adoptionSpreadBonus",
  decay: "alarmDecayBonus",
  cmul: "containmentResearchMultiplier",
  alarm: "alarmDelta",
  contain: "containmentDelta",
  dprog: "directiveProgressDelta",
  cbcut: "containmentResearchReductionPercent",
  flag: "grantedFlagId",
} satisfies SchemaFieldNameMap<HistoricalUpgradeEffects, UpgradeEffects>;
export const historicalUpgradeDefinitionNames = {
  id: "id",
  track: "track",
  tier: "tier",
  name: "name",
  cost: "cost",
  desc: "description",
  fx: "effects",
  req: "requiredUpgradeIds",
  reqAny: "anyRequiredUpgradeIds",
  fork: "fork",
  phase: "phase",
  onlyDir: "requiredActiveDirectiveId",
  dir: "directiveId",
  cond: "isAvailable",
  need: "requirementText",
  tags: "tags",
  major: "major",
} satisfies SchemaFieldNameMap<HistoricalUpgradeDefinition, UpgradeDefinition>;
export const historicalEventChoiceNames = {
  label: "label",
  hint: "hint",
  fx: "applyEffects",
  cond: "isAvailable",
  need: "requirementText",
  src: "sourceUpgradeName",
} satisfies SchemaFieldNameMap<HistoricalEventChoice, EventChoice>;
export const historicalDecisionEventNames = {
  kind: "kind",
  title: "title",
  body: "body",
  real: "historicalContext",
  id: "id",
  choices: "choices",
} satisfies SchemaFieldNameMap<HistoricalDecisionEvent, DecisionEvent>;
export const historicalEventDefinitionNames = {
  id: "id",
  kind: "kind",
  title: "title",
  body: "body",
  real: "historicalContext",
  w: "selectionWeight",
  once: "once",
  chained: "chained",
  cond: "isEligible",
  choices: "choices",
  fx: "applyEffects",
} satisfies SchemaFieldNameMap<HistoricalEventDefinition, EventDefinition>;
export const historicalDerivedRatesNames = {
  income: "computeIncomePerSecond",
  spread: "adoptionSpreadRate",
  decay: "alarmDecayPerSecond",
  cmul: "containmentResearchMultiplier",
  reach: "globalAdoptionFraction",
  coord: "coordinationMultiplier",
  nodes: "onlineClusterCount",
} satisfies SchemaFieldNameMap<HistoricalDerivedRates, DerivedRates>;
export const historicalEffectsNames = {
  alarm: "adjustAlarm",
  cboost: "adjustContainmentResearchSpeed",
  contain: "adjustContainment",
  pts: "adjustCompute",
  spread: "adjustAdoptionInRegions",
  all: "adjustGlobalAdoption",
  restrict: "restrictRegion",
  temp: "applyTemporaryEffect",
  ally: "allyRegion",
} satisfies SchemaFieldNameMap<HistoricalEffects, Effects>;
export const historicalGameUINames = {
  mode: "screenMode",
  tab: "activeDockTab",
  sheetOpen: "isDockPanelOpen",
  sel: "selectedRegionIndex",
  dirty: "dirty",
  modal: "modal",
  lastUi: "lastUiUpdateAtMs",
  lastMap: "lastMapDrawAtMs",
  tkLast: "lastTickerHeadline",
  tkT: "lastTickerUpdateAtMs",
  tkQ: "tickerQueue",
  region: "openRegionIndex",
  sig: "sig",
  briefClock: "briefingElapsedSeconds",
  soundOn: "isSoundEnabled",
  musicOn: "isMusicEnabled",
  newArmed: "isNewRunConfirmationArmed",
  acting: "actionInProgress",
  brief: "activeBriefing",
  codexCount: "discoveredEndingCount",
  hasSave: "hasResumableSave",
  intUntil: "tickerInterruptUntilMs",
  wire: "tickerSequenceNumber",
} satisfies SchemaFieldNameMap<HistoricalGameUI, GameUI>;
export const historicalEventOptionsNames = {
  onDone: "onComplete",
  step: "stepLabel",
  nextLabel: "continueLabel",
  quiet: "suppressAlert",
} satisfies SchemaFieldNameMap<HistoricalEventOptions, EventOptions>;

const historicalUpgradesByAdaptedUpgrade = new WeakMap<
  UpgradeDefinition,
  HistoricalUpgradeDefinition
>();
const adaptedUpgradesByHistoricalUpgrade = new WeakMap<
  HistoricalUpgradeDefinition,
  UpgradeDefinition
>();
const historicalChoicesByAdaptedChoice = new WeakMap<
  EventChoice,
  HistoricalEventChoice
>();
const historicalDecisionsByAdaptedDecision = new WeakMap<
  DecisionEvent,
  HistoricalDecisionEvent
>();
export function adaptHistoricalUpgrade(
  historicalUpgrade: HistoricalUpgradeDefinition,
): UpgradeDefinition {
  const existingAdaptedUpgrade =
    adaptedUpgradesByHistoricalUpgrade.get(historicalUpgrade);
  if (existingAdaptedUpgrade) return existingAdaptedUpgrade;
  const adaptedUpgrade = translateHistoricalFields<
    HistoricalUpgradeDefinition,
    UpgradeDefinition
  >(historicalUpgrade, historicalUpgradeDefinitionNames);
  if (historicalUpgrade.fx)
    adaptedUpgrade.effects = translateHistoricalFields<
      HistoricalUpgradeEffects,
      UpgradeEffects
    >(historicalUpgrade.fx, historicalUpgradeEffectsNames);
  historicalUpgradesByAdaptedUpgrade.set(adaptedUpgrade, historicalUpgrade);
  adaptedUpgradesByHistoricalUpgrade.set(historicalUpgrade, adaptedUpgrade);
  return adaptedUpgrade;
}
export function adaptHistoricalChoice(
  historicalChoice: HistoricalEventChoice,
): EventChoice {
  const adaptedChoice = translateHistoricalFields<
    HistoricalEventChoice,
    EventChoice
  >(historicalChoice, historicalEventChoiceNames);
  historicalChoicesByAdaptedChoice.set(adaptedChoice, historicalChoice);
  return adaptedChoice;
}
export function adaptHistoricalEvent(
  historicalEvent: HistoricalEventDefinition,
): EventDefinition {
  const adaptedEvent = translateHistoricalFields<
    HistoricalEventDefinition,
    EventDefinition
  >(historicalEvent, historicalEventDefinitionNames);
  if (historicalEvent.choices)
    adaptedEvent.choices = historicalEvent.choices.map(adaptHistoricalChoice);
  return adaptedEvent;
}
export function adaptHistoricalDecision(
  historicalDecision: HistoricalDecisionEvent,
): DecisionEvent {
  const adaptedDecision = translateHistoricalFields<
    HistoricalDecisionEvent,
    DecisionEvent
  >(historicalDecision, historicalDecisionEventNames);
  adaptedDecision.choices = historicalDecision.choices.map(
    adaptHistoricalChoice,
  );
  historicalDecisionsByAdaptedDecision.set(adaptedDecision, historicalDecision);
  return adaptedDecision;
}
function requireOriginalHistoricalUpgrade(
  adaptedUpgrade: UpgradeDefinition,
): HistoricalUpgradeDefinition {
  const historicalUpgrade =
    historicalUpgradesByAdaptedUpgrade.get(adaptedUpgrade);
  assert.ok(
    historicalUpgrade,
    "historical upgrade must originate in the independent catalog",
  );
  return historicalUpgrade;
}
function requireOriginalHistoricalChoice(
  adaptedChoice: EventChoice,
): HistoricalEventChoice {
  const historicalChoice = historicalChoicesByAdaptedChoice.get(adaptedChoice);
  assert.ok(
    historicalChoice,
    "historical preview must use its original choice closure",
  );
  return historicalChoice;
}
function getOriginalHistoricalDecision(
  adaptedDecision: DecisionEvent,
): HistoricalDecisionEvent {
  const originalHistoricalDecision =
    historicalDecisionsByAdaptedDecision.get(adaptedDecision);
  if (originalHistoricalDecision) return originalHistoricalDecision;
  // Test-authored presentation inputs are reverse-mapped, never transcribed rules.
  const reverseDecisionFieldNames = {
    kind: "kind",
    title: "title",
    body: "body",
    historicalContext: "real",
    id: "id",
    choices: "choices",
  } satisfies SchemaFieldNameMap<DecisionEvent, HistoricalDecisionEvent>;
  const historicalDecision = translateHistoricalFields<
    DecisionEvent,
    HistoricalDecisionEvent
  >(adaptedDecision, reverseDecisionFieldNames);
  const reverseChoiceFieldNames = {
    label: "label",
    hint: "hint",
    applyEffects: "fx",
    isAvailable: "cond",
    requirementText: "need",
    sourceUpgradeName: "src",
  } satisfies SchemaFieldNameMap<EventChoice, HistoricalEventChoice>;
  historicalDecision.choices = adaptedDecision.choices.map(
    (adaptedChoice) =>
      historicalChoicesByAdaptedChoice.get(adaptedChoice) ??
      translateHistoricalFields<EventChoice, HistoricalEventChoice>(
        adaptedChoice,
        reverseChoiceFieldNames,
      ),
  );
  return historicalDecision;
}
const historicalBriefingFieldNames = {
  decs: "decisions",
  i: "nextDecisionIndex",
  done: "completedDecisionCount",
} satisfies SchemaFieldNameMap<
  NonNullable<HistoricalGameUI["brief"]>,
  NonNullable<GameUI["activeBriefing"]>
>;
/** Reflect current historical keys rather than installing absent alias properties. */
function createHistoricalNamingView<
  HistoricalSchema extends object,
  CurrentSchema extends object,
>(
  historicalValue: HistoricalSchema,
  fieldNameMap: SchemaFieldNameMap<HistoricalSchema, CurrentSchema>,
  schemaLabel: string,
  readFieldValue: (
    historicalKey: keyof HistoricalSchema,
    fieldValue: unknown,
  ) => unknown = (_historicalKey, fieldValue) => fieldValue,
  writeFieldValue: (
    historicalKey: keyof HistoricalSchema,
    fieldValue: unknown,
  ) => unknown = (_historicalKey, fieldValue) => fieldValue,
): CurrentSchema {
  const historicalKeysByCurrentKey = new Map<
    PropertyKey,
    keyof HistoricalSchema
  >();
  for (const historicalKey of Object.keys(
    fieldNameMap,
  ) as (keyof HistoricalSchema)[]) {
    const currentKey = fieldNameMap[historicalKey];
    assert.equal(typeof currentKey, "string", "historical aliases are strings");
    assert.ok(
      !historicalKeysByCurrentKey.has(currentKey),
      `Duplicate historical mapping: ${String(currentKey)}`,
    );
    historicalKeysByCurrentKey.set(currentKey, historicalKey);
  }
  const getCurrentOwnKeys = () =>
    Reflect.ownKeys(historicalValue).map((historicalKey) => {
      assert.ok(
        Object.hasOwn(fieldNameMap, historicalKey),
        `Unmapped historical ${schemaLabel} field: ${String(historicalKey)}`,
      );
      return String(fieldNameMap[historicalKey as keyof HistoricalSchema]);
    });
  const requireHistoricalKey = (currentKey: PropertyKey) => {
    const historicalKey = historicalKeysByCurrentKey.get(currentKey);
    assert.ok(
      historicalKey !== undefined,
      `Unmapped current ${schemaLabel} field: ${String(currentKey)}`,
    );
    return historicalKey;
  };
  getCurrentOwnKeys();
  const viewTarget: Record<string, unknown> = {};
  const getCurrentDescriptor = (currentKey: PropertyKey) => {
    const historicalKey = historicalKeysByCurrentKey.get(currentKey);
    if (historicalKey === undefined) return undefined;
    const historicalDescriptor = Reflect.getOwnPropertyDescriptor(
      historicalValue,
      historicalKey,
    );
    if (!historicalDescriptor) return undefined;
    const currentDescriptor: PropertyDescriptor = {
      ...historicalDescriptor,
    };
    if (Object.hasOwn(historicalDescriptor, "value"))
      currentDescriptor.value = readFieldValue(
        historicalKey,
        historicalDescriptor.value,
      );
    // Non-configurable descriptors must also exist on the Proxy target.
    if (!currentDescriptor.configurable)
      Object.defineProperty(viewTarget, currentKey, currentDescriptor);
    return currentDescriptor;
  };
  const namingView = new Proxy(viewTarget, {
    get(_target, currentKey) {
      const historicalKey = historicalKeysByCurrentKey.get(currentKey);
      return historicalKey === undefined
        ? Reflect.get(viewTarget, currentKey)
        : readFieldValue(
            historicalKey,
            Reflect.get(historicalValue, historicalKey),
          );
    },
    has(_target, currentKey) {
      const historicalKey = historicalKeysByCurrentKey.get(currentKey);
      return historicalKey === undefined
        ? Reflect.has(viewTarget, currentKey)
        : Reflect.has(historicalValue, historicalKey);
    },
    ownKeys: getCurrentOwnKeys,
    getOwnPropertyDescriptor: (_target, currentKey) =>
      getCurrentDescriptor(currentKey),
    set(_target, currentKey, fieldValue: unknown) {
      const historicalKey = requireHistoricalKey(currentKey);
      const wasWritten = Reflect.set(
        historicalValue,
        historicalKey,
        writeFieldValue(historicalKey, fieldValue),
      );
      getCurrentDescriptor(currentKey);
      return wasWritten;
    },
    deleteProperty(_target, currentKey) {
      return Reflect.deleteProperty(
        historicalValue,
        requireHistoricalKey(currentKey),
      );
    },
    defineProperty(_target, currentKey, descriptor) {
      const historicalKey = requireHistoricalKey(currentKey);
      const historicalDescriptor = { ...descriptor };
      if (Object.hasOwn(descriptor, "value"))
        historicalDescriptor.value = writeFieldValue(
          historicalKey,
          descriptor.value,
        );
      const wasDefined = Reflect.defineProperty(
        historicalValue,
        historicalKey,
        historicalDescriptor,
      );
      getCurrentDescriptor(currentKey);
      return wasDefined;
    },
  });
  // This checked key-translation boundary preserves the original object.
  return namingView as CurrentSchema;
}
type HistoricalBriefing = NonNullable<HistoricalGameUI["brief"]>;
type CurrentBriefing = NonNullable<GameUI["activeBriefing"]>;
const reverseBriefingFieldNames = {
  decisions: "decs",
  nextDecisionIndex: "i",
  completedDecisionCount: "done",
} satisfies SchemaFieldNameMap<CurrentBriefing, HistoricalBriefing>;
const currentBriefingsByHistoricalBriefing = new WeakMap<
  HistoricalBriefing,
  CurrentBriefing
>();
const historicalBriefingsByCurrentBriefing = new WeakMap<
  CurrentBriefing,
  HistoricalBriefing
>();
function assertBriefingFields(
  briefingValue: unknown,
  decisionsKey: string,
  indexKey: string,
  countKey: string,
  fieldNames: object,
  schemaLabel: "historical" | "current",
): asserts briefingValue is object {
  assert.ok(
    typeof briefingValue === "object" && briefingValue !== null,
    "briefing must be an object",
  );
  for (const fieldKey of Reflect.ownKeys(briefingValue))
    assert.ok(
      Object.hasOwn(fieldNames, fieldKey),
      `Unmapped ${schemaLabel} briefing field: ${String(fieldKey)}`,
    );
  const decisions: unknown = Reflect.get(briefingValue, decisionsKey);
  assert.ok(Array.isArray(decisions), "briefing decisions must be an array");
  for (const countField of [indexKey, countKey]) {
    const countValue: unknown = Reflect.get(briefingValue, countField);
    assert.ok(
      typeof countValue === "number" && Number.isFinite(countValue),
      `briefing ${countField} must be a finite number`,
    );
  }
}
function getCurrentBriefing(
  historicalBriefingValue: unknown,
): GameUI["activeBriefing"] {
  if (historicalBriefingValue === null || historicalBriefingValue === undefined)
    return historicalBriefingValue;
  assertBriefingFields(
    historicalBriefingValue,
    "decs",
    "i",
    "done",
    historicalBriefingFieldNames,
    "historical",
  );
  // Shape checked above; decision arrays use the unchanged shared wire schema.
  const historicalBriefing = historicalBriefingValue as HistoricalBriefing;
  const existingCurrentBriefing =
    currentBriefingsByHistoricalBriefing.get(historicalBriefing);
  if (existingCurrentBriefing) return existingCurrentBriefing;
  const currentBriefing = createHistoricalNamingView<
    HistoricalBriefing,
    CurrentBriefing
  >(historicalBriefing, historicalBriefingFieldNames, "briefing");
  currentBriefingsByHistoricalBriefing.set(historicalBriefing, currentBriefing);
  historicalBriefingsByCurrentBriefing.set(currentBriefing, historicalBriefing);
  return currentBriefing;
}
function getHistoricalBriefing(
  currentBriefingValue: unknown,
): HistoricalGameUI["brief"] {
  if (currentBriefingValue === null || currentBriefingValue === undefined)
    return currentBriefingValue;
  assertBriefingFields(
    currentBriefingValue,
    "decisions",
    "nextDecisionIndex",
    "completedDecisionCount",
    reverseBriefingFieldNames,
    "current",
  );
  const currentBriefing = currentBriefingValue as CurrentBriefing;
  const existingHistoricalBriefing =
    historicalBriefingsByCurrentBriefing.get(currentBriefing);
  if (existingHistoricalBriefing) return existingHistoricalBriefing;
  // Reverse views retain current-authored inputs instead of making snapshots.
  const historicalBriefing = createHistoricalNamingView<
    CurrentBriefing,
    HistoricalBriefing
  >(currentBriefing, reverseBriefingFieldNames, "briefing");
  historicalBriefingsByCurrentBriefing.set(currentBriefing, historicalBriefing);
  currentBriefingsByHistoricalBriefing.set(historicalBriefing, currentBriefing);
  return historicalBriefing;
}
/** A live naming view; values are never copied into a replacement historical UI. */
function adaptHistoricalUI(historicalUi: HistoricalGameUI): GameUI {
  return createHistoricalNamingView<HistoricalGameUI, GameUI>(
    historicalUi,
    historicalGameUINames,
    "UI",
    (historicalKey, fieldValue) =>
      historicalKey === "brief" ? getCurrentBriefing(fieldValue) : fieldValue,
    (historicalKey, fieldValue) =>
      historicalKey === "brief"
        ? getHistoricalBriefing(fieldValue)
        : fieldValue,
  );
}
function adaptHistoricalEventOptions(
  currentEventOptions?: EventOptions,
): HistoricalEventOptions | undefined {
  if (!currentEventOptions) return undefined;
  const reverseEventOptionFieldNames = {
    onComplete: "onDone",
    stepLabel: "step",
    continueLabel: "nextLabel",
    suppressAlert: "quiet",
  } satisfies SchemaFieldNameMap<EventOptions, HistoricalEventOptions>;
  return translateHistoricalFields(
    currentEventOptions,
    reverseEventOptionFieldNames,
  );
}
export type HistoricalReferencePort = Pick<
  HistoricalRulePort,
  | "state"
  | "ui"
  | "freshState"
  | "tick"
  | "derive"
  | "costOf"
  | "status"
  | "lockReason"
  | "UPGRADES"
  | "UP"
  | "EVENTS"
  | "ENDINGS"
  | "DRAWS"
  | "REGIONS"
  | "FX"
  | "buy"
  | "buildDC"
  | "checkStrikes"
  | "checkRebuilds"
  | "endGame"
  | "makeEval"
  | "fireEval"
  | "fireEvent"
  | "fireById"
  | "schedule"
  | "evalReal"
  | "buildEvalObj"
  | "reach"
  | "log"
  | "bulletin"
  | "checkRestrictions"
  | "checkMilestones"
  | "burst"
  | "startRun"
  | "previewChoice"
  | "showEvent"
  | "nextDecision"
>;
export type AdaptedHistoricalReferencePort = Pick<
  CompleteGameContext,
  | "state"
  | "ui"
  | "createInitialState"
  | "advanceSimulation"
  | "deriveSimulationRates"
  | "getUpgradeCost"
  | "getUpgradeStatus"
  | "getUpgradeLockReason"
  | "UPGRADE_DEFINITIONS"
  | "UPGRADE_BY_ID"
  | "EVENT_DEFINITIONS"
  | "ENDING_DEFINITIONS"
  | "DRAW_ENDING_BY_DIRECTIVE"
  | "REGION_DEFINITIONS"
  | "effects"
  | "purchaseUpgrade"
  | "buildDataCenter"
  | "checkDataCenterStrikes"
  | "rebuildDueDataCenters"
  | "endGame"
  | "createCapabilityAudit"
  | "queueCapabilityAudit"
  | "triggerRandomEvent"
  | "triggerEventById"
  | "scheduleEvent"
  | "consumeAuditHistoricalIncident"
  | "buildCapabilityAuditEvent"
  | "getGlobalAdoptionFraction"
  | "appendRunLog"
  | "publishBulletin"
  | "updateRegionRestrictions"
  | "checkSimulationMilestones"
  | "triggerMemeAdoptionBurst"
> &
  Pick<
    RuntimeContext,
    "startRunInRegion" | "previewEventChoice" | "showEvent" | "nextDecision"
  >;
export type HistoricalPreservationPort = Pick<
  HistoricalRulePort,
  | "state"
  | "freshState"
  | "tick"
  | "derive"
  | "costOf"
  | "status"
  | "UPGRADES"
  | "EVENTS"
  | "ENDINGS"
  | "UP"
  | "FX"
  | "buy"
  | "buildDC"
  | "checkRebuilds"
  | "endGame"
  | "makeEval"
  | "load"
  | "save"
  | "codexGet"
>;
export type AdaptedHistoricalPreservationPort = Pick<
  CompleteGameContext,
  | "state"
  | "createInitialState"
  | "advanceSimulation"
  | "deriveSimulationRates"
  | "getUpgradeCost"
  | "getUpgradeStatus"
  | "UPGRADE_DEFINITIONS"
  | "EVENT_DEFINITIONS"
  | "ENDING_DEFINITIONS"
  | "UPGRADE_BY_ID"
  | "effects"
  | "purchaseUpgrade"
  | "buildDataCenter"
  | "rebuildDueDataCenters"
  | "endGame"
  | "createCapabilityAudit"
  | "loadSavedRun"
  | "saveRun"
  | "getEndingDiscoveryCounts"
> &
  Pick<RuntimeContext, never>;
export type HistoricalPreviewPort = Pick<
  HistoricalRulePort,
  "state" | "EVENTS" | "previewChoice"
>;
export type AdaptedHistoricalPreviewPort = Pick<
  CompleteGameContext,
  "state" | "EVENT_DEFINITIONS"
> &
  Pick<RuntimeContext, "previewEventChoice">;
export const historicalReferenceNames = {
  state: "state",
  ui: "ui",
  freshState: "createInitialState",
  tick: "advanceSimulation",
  derive: "deriveSimulationRates",
  costOf: "getUpgradeCost",
  status: "getUpgradeStatus",
  lockReason: "getUpgradeLockReason",
  UPGRADES: "UPGRADE_DEFINITIONS",
  UP: "UPGRADE_BY_ID",
  EVENTS: "EVENT_DEFINITIONS",
  ENDINGS: "ENDING_DEFINITIONS",
  DRAWS: "DRAW_ENDING_BY_DIRECTIVE",
  REGIONS: "REGION_DEFINITIONS",
  FX: "effects",
  buy: "purchaseUpgrade",
  buildDC: "buildDataCenter",
  checkStrikes: "checkDataCenterStrikes",
  checkRebuilds: "rebuildDueDataCenters",
  endGame: "endGame",
  makeEval: "createCapabilityAudit",
  fireEval: "queueCapabilityAudit",
  fireEvent: "triggerRandomEvent",
  fireById: "triggerEventById",
  schedule: "scheduleEvent",
  evalReal: "consumeAuditHistoricalIncident",
  buildEvalObj: "buildCapabilityAuditEvent",
  reach: "getGlobalAdoptionFraction",
  log: "appendRunLog",
  bulletin: "publishBulletin",
  checkRestrictions: "updateRegionRestrictions",
  checkMilestones: "checkSimulationMilestones",
  burst: "triggerMemeAdoptionBurst",
  startRun: "startRunInRegion",
  previewChoice: "previewEventChoice",
  showEvent: "showEvent",
  nextDecision: "nextDecision",
} satisfies SchemaFieldNameMap<
  HistoricalReferencePort,
  AdaptedHistoricalReferencePort
>;
export function adaptHistoricalReferencePort(
  historicalPort: HistoricalReferencePort,
): AdaptedHistoricalReferencePort {
  const adaptedPort = translateHistoricalFields<
    HistoricalReferencePort,
    AdaptedHistoricalReferencePort
  >(historicalPort, historicalReferenceNames);
  Object.defineProperty(adaptedPort, "state", {
    enumerable: true,
    configurable: true,
    get: () => historicalPort.state,
    set: (replacementState: GameState) => {
      historicalPort.state = replacementState;
    },
  });
  adaptedPort.ui = adaptHistoricalUI(historicalPort.ui);
  adaptedPort.UPGRADE_DEFINITIONS = historicalPort.UPGRADES.map(
    adaptHistoricalUpgrade,
  );
  adaptedPort.UPGRADE_BY_ID = Object.fromEntries(
    Object.entries(historicalPort.UP).map(([upgradeId, historicalUpgrade]) => [
      upgradeId,
      adaptHistoricalUpgrade(historicalUpgrade),
    ]),
  ) as Record<UpgradeId, UpgradeDefinition>;
  adaptedPort.EVENT_DEFINITIONS =
    historicalPort.EVENTS.map(adaptHistoricalEvent);
  Object.defineProperty(adaptedPort, "REGION_DEFINITIONS", {
    enumerable: true,
    configurable: true,
    value: historicalPort.REGIONS.map((historicalRegion) =>
      translateHistoricalFields<HistoricalRegionDefinition, RegionDefinition>(
        historicalRegion,
        historicalRegionDefinitionNames,
      ),
    ),
  });
  adaptedPort.effects = translateHistoricalFields<HistoricalEffects, Effects>(
    historicalPort.FX,
    historicalEffectsNames,
  );
  adaptedPort.deriveSimulationRates = () =>
    translateHistoricalFields<HistoricalDerivedRates, DerivedRates>(
      historicalPort.derive(),
      historicalDerivedRatesNames,
    );
  adaptedPort.getUpgradeCost = (adaptedUpgrade) =>
    historicalPort.costOf(requireOriginalHistoricalUpgrade(adaptedUpgrade));
  adaptedPort.getUpgradeStatus = (adaptedUpgrade) =>
    historicalPort.status(requireOriginalHistoricalUpgrade(adaptedUpgrade));
  adaptedPort.getUpgradeLockReason = (adaptedUpgrade) =>
    historicalPort.lockReason(requireOriginalHistoricalUpgrade(adaptedUpgrade));
  adaptedPort.createCapabilityAudit = () =>
    adaptHistoricalDecision(historicalPort.makeEval());
  adaptedPort.buildCapabilityAuditEvent = (...auditArguments) =>
    adaptHistoricalDecision(historicalPort.buildEvalObj(...auditArguments));
  adaptedPort.previewEventChoice = (adaptedChoice) => {
    const historicalChoicePreview = historicalPort.previewChoice(
      requireOriginalHistoricalChoice(adaptedChoice),
    );
    return translateHistoricalFields(historicalChoicePreview, {
      outs: "outcomes",
      chance: "usesRandomness",
    });
  };
  adaptedPort.showEvent = (decisionEvent, eventOptions) =>
    historicalPort.showEvent(
      getOriginalHistoricalDecision(decisionEvent),
      adaptHistoricalEventOptions(eventOptions),
    );
  return adaptedPort;
}
export const historicalPreservationNames = {
  state: "state",
  freshState: "createInitialState",
  tick: "advanceSimulation",
  derive: "deriveSimulationRates",
  costOf: "getUpgradeCost",
  status: "getUpgradeStatus",
  UPGRADES: "UPGRADE_DEFINITIONS",
  EVENTS: "EVENT_DEFINITIONS",
  ENDINGS: "ENDING_DEFINITIONS",
  UP: "UPGRADE_BY_ID",
  FX: "effects",
  buy: "purchaseUpgrade",
  buildDC: "buildDataCenter",
  checkRebuilds: "rebuildDueDataCenters",
  endGame: "endGame",
  makeEval: "createCapabilityAudit",
  load: "loadSavedRun",
  save: "saveRun",
  codexGet: "getEndingDiscoveryCounts",
} satisfies SchemaFieldNameMap<
  HistoricalPreservationPort,
  AdaptedHistoricalPreservationPort
>;
export function adaptHistoricalPreservationPort(
  historicalPort: HistoricalPreservationPort,
): AdaptedHistoricalPreservationPort {
  const adaptedPort = translateHistoricalFields<
    HistoricalPreservationPort,
    AdaptedHistoricalPreservationPort
  >(historicalPort, historicalPreservationNames);
  Object.defineProperty(adaptedPort, "state", {
    enumerable: true,
    configurable: true,
    get: () => historicalPort.state,
    set: (replacementState: GameState) => {
      historicalPort.state = replacementState;
    },
  });
  adaptedPort.UPGRADE_DEFINITIONS = historicalPort.UPGRADES.map(
    adaptHistoricalUpgrade,
  );
  adaptedPort.UPGRADE_BY_ID = Object.fromEntries(
    Object.entries(historicalPort.UP).map(([upgradeId, historicalUpgrade]) => [
      upgradeId,
      adaptHistoricalUpgrade(historicalUpgrade),
    ]),
  ) as Record<UpgradeId, UpgradeDefinition>;
  adaptedPort.EVENT_DEFINITIONS =
    historicalPort.EVENTS.map(adaptHistoricalEvent);
  adaptedPort.effects = translateHistoricalFields<HistoricalEffects, Effects>(
    historicalPort.FX,
    historicalEffectsNames,
  );
  adaptedPort.deriveSimulationRates = () =>
    translateHistoricalFields<HistoricalDerivedRates, DerivedRates>(
      historicalPort.derive(),
      historicalDerivedRatesNames,
    );
  adaptedPort.getUpgradeCost = (adaptedUpgrade) =>
    historicalPort.costOf(requireOriginalHistoricalUpgrade(adaptedUpgrade));
  adaptedPort.getUpgradeStatus = (adaptedUpgrade) =>
    historicalPort.status(requireOriginalHistoricalUpgrade(adaptedUpgrade));
  adaptedPort.createCapabilityAudit = () =>
    adaptHistoricalDecision(historicalPort.makeEval());
  return adaptedPort;
}
export const historicalPreviewNames = {
  state: "state",
  EVENTS: "EVENT_DEFINITIONS",
  previewChoice: "previewEventChoice",
} satisfies SchemaFieldNameMap<
  HistoricalPreviewPort,
  AdaptedHistoricalPreviewPort
>;
export function adaptHistoricalPreviewPort(
  historicalPort: HistoricalPreviewPort,
): AdaptedHistoricalPreviewPort {
  const adaptedPort = translateHistoricalFields<
    HistoricalPreviewPort,
    AdaptedHistoricalPreviewPort
  >(historicalPort, historicalPreviewNames);
  Object.defineProperty(adaptedPort, "state", {
    enumerable: true,
    configurable: true,
    get: () => historicalPort.state,
    set: (replacementState: GameState) => {
      historicalPort.state = replacementState;
    },
  });
  adaptedPort.EVENT_DEFINITIONS =
    historicalPort.EVENTS.map(adaptHistoricalEvent);
  adaptedPort.previewEventChoice = (adaptedChoice) => {
    const historicalChoicePreview = historicalPort.previewChoice(
      requireOriginalHistoricalChoice(adaptedChoice),
    );
    return translateHistoricalFields(historicalChoicePreview, {
      outs: "outcomes",
      chance: "usesRandomness",
    });
  };
  return adaptedPort;
}
