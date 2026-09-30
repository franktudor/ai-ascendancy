// Compile-only contracts, included in the same strict vue-tsc project as the
// entire application, every SFC, Node tests and Playwright tests. No suppression
// directives: widening a domain/API to `any` or `string` fails this file.
import type { InjectionKey } from "vue";
import type { createGame } from "../src/game/createGame";
import type { gameContextInjectionKey } from "../src/game/injection";
import type { mountRuntime } from "../src/game/runtime";
import type { createLifecycle } from "../src/game/lifecycle";
import type {
  CompleteGameContext,
  RuntimeContext,
  GameState,
  UpgradeId,
  RegionId,
  DirectiveId,
  EventId,
  TrackId,
  EventDefinition,
  Effects,
  Lifecycle,
} from "../src/game/types";

type AssertTrueContract<ContractType extends true> = ContractType;
type AreTypesEqual<ActualType, ExpectedType> =
  (<ComparedType>() => ComparedType extends ActualType ? 1 : 2) extends <
    ComparedType,
  >() => ComparedType extends ExpectedType ? 1 : 2
    ? true
    : false;
type IsUntypedEscape<ContractType> = 0 extends 1 & ContractType ? true : false;
type IsTypedValue<ContractType> =
  IsUntypedEscape<ContractType> extends false ? true : false;
type RejectsInvalidType<ContractType, InvalidType> =
  InvalidType extends ContractType ? false : true;
type AreFunctionMembersTyped<ContractType> = {
  [MemberKey in keyof ContractType]-?: ContractType[MemberKey] extends (
    ...functionArguments: infer ArgumentTypes
  ) => infer ReturnValueType
    ? IsTypedValue<ReturnValueType> extends true
      ? {
          [ArgumentIndex in keyof ArgumentTypes]-?: IsTypedValue<
            ArgumentTypes[ArgumentIndex]
          >;
        }[number] extends true
        ? true
        : false
      : false
    : IsTypedValue<ContractType[MemberKey]>;
}[keyof ContractType];

export type TypeContracts = [
  AssertTrueContract<
    AreTypesEqual<ReturnType<typeof createGame>, CompleteGameContext>
  >,
  AssertTrueContract<
    AreTypesEqual<ReturnType<typeof mountRuntime>, () => void>
  >,
  AssertTrueContract<
    AreTypesEqual<ReturnType<typeof createLifecycle>, Lifecycle>
  >,
  AssertTrueContract<
    AreTypesEqual<typeof gameContextInjectionKey, InjectionKey<RuntimeContext>>
  >,
  AssertTrueContract<IsTypedValue<GameState>>,
  AssertTrueContract<IsTypedValue<GameState["flags"]>>,
  AssertTrueContract<
    IsTypedValue<CompleteGameContext["UPGRADE_BY_ID"][UpgradeId]>
  >,
  AssertTrueContract<IsTypedValue<EventDefinition>>,
  AssertTrueContract<IsTypedValue<Effects>>,
  AssertTrueContract<AreFunctionMembersTyped<Effects>>,
  AssertTrueContract<
    AreTypesEqual<Parameters<Effects["adjustCompute"]>, [number]>
  >,
  AssertTrueContract<
    AreTypesEqual<ReturnType<Effects["adjustCompute"]>, string>
  >,
  AssertTrueContract<AreFunctionMembersTyped<CompleteGameContext>>,
  AssertTrueContract<
    IsTypedValue<Parameters<RuntimeContext["soundController"]["playCue"]>[0]>
  >,
  AssertTrueContract<
    AreTypesEqual<
      Parameters<
        NonNullable<
          RuntimeContext["endingEffectsById"]["computronium"]["drawFrame"]
        >
      >[0],
      CanvasRenderingContext2D
    >
  >,
  AssertTrueContract<RejectsInvalidType<UpgradeId, "missing_upgrade">>,
  AssertTrueContract<RejectsInvalidType<RegionId, "ZZ">>,
  AssertTrueContract<RejectsInvalidType<DirectiveId, "unknown_directive">>,
  AssertTrueContract<RejectsInvalidType<EventId, "missing_event">>,
  AssertTrueContract<
    AreTypesEqual<
      {
        id: "brownout";
        kind: "INCIDENT";
        title: string;
        body: string;
        selectionWeight: number;
        choices: [];
      } extends EventDefinition
        ? true
        : false,
      true
    >
  >,
  AssertTrueContract<
    AreTypesEqual<
      {
        id: "brownout";
        kind: "INCIDENT";
        title: string;
        body: string;
        selectionWeight: number;
        applyEffects: () => string;
      } extends EventDefinition
        ? true
        : false,
      true
    >
  >,
  AssertTrueContract<RejectsInvalidType<TrackId, string>>,
  AssertTrueContract<RejectsInvalidType<GameState["speed"], 4>>,
  AssertTrueContract<
    RejectsInvalidType<
      Parameters<Effects["applyTemporaryEffect"]>[0],
      "missing_timer"
    >
  >,
  AssertTrueContract<
    RejectsInvalidType<
      Parameters<CompleteGameContext["purchaseUpgrade"]>[0],
      string
    >
  >,
  AssertTrueContract<
    RejectsInvalidType<
      Parameters<RuntimeContext["selectArchitecture"]>[0],
      "invalid_architecture"
    >
  >,
  AssertTrueContract<
    RejectsInvalidType<
      EventDefinition,
      {
        id: "brownout";
        kind: "INCIDENT";
        title: string;
        body: string;
        selectionWeight: number;
        choices: [];
        applyEffects: () => string;
      }
    >
  >,
];
