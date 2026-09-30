// Compile-only contracts, included in the same strict vue-tsc project as the
// entire application, every SFC, Node tests and Playwright tests. No suppression
// directives: widening a domain/API to `any` or `string` fails this file.
import type { InjectionKey } from "vue";
import type { createGame } from "../src/game/createGame";
import type { gameKey } from "../src/game/injection";
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

type Assert<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type IsAny<T> = 0 extends 1 & T ? true : false;
type NotAny<T> = IsAny<T> extends false ? true : false;
type DoesNotAccept<T, Invalid> = Invalid extends T ? false : true;
type FunctionMembersSafe<T> = {
  [K in keyof T]-?: T[K] extends (...args: infer A) => infer R
    ? NotAny<R> extends true
      ? { [I in keyof A]-?: NotAny<A[I]> }[number] extends true
        ? true
        : false
      : false
    : NotAny<T[K]>;
}[keyof T];

export type TypeContracts = [
  Assert<Equal<ReturnType<typeof createGame>, CompleteGameContext>>,
  Assert<Equal<ReturnType<typeof mountRuntime>, () => void>>,
  Assert<Equal<ReturnType<typeof createLifecycle>, Lifecycle>>,
  Assert<Equal<typeof gameKey, InjectionKey<RuntimeContext>>>,
  Assert<NotAny<GameState>>,
  Assert<NotAny<GameState["flags"]>>,
  Assert<NotAny<CompleteGameContext["UP"][UpgradeId]>>,
  Assert<NotAny<EventDefinition>>,
  Assert<NotAny<Effects>>,
  Assert<FunctionMembersSafe<Effects>>,
  Assert<Equal<Parameters<Effects["pts"]>, [number]>>,
  Assert<Equal<ReturnType<Effects["pts"]>, string>>,
  Assert<FunctionMembersSafe<CompleteGameContext>>,
  Assert<NotAny<Parameters<RuntimeContext["SND"]["play"]>[0]>>,
  Assert<
    Equal<
      Parameters<
        NonNullable<RuntimeContext["END_FX"]["computronium"]["draw"]>
      >[0],
      CanvasRenderingContext2D
    >
  >,
  Assert<DoesNotAccept<UpgradeId, "missing_upgrade">>,
  Assert<DoesNotAccept<RegionId, "ZZ">>,
  Assert<DoesNotAccept<DirectiveId, "unknown_directive">>,
  Assert<DoesNotAccept<EventId, "missing_event">>,
  Assert<DoesNotAccept<TrackId, string>>,
  Assert<DoesNotAccept<GameState["speed"], 4>>,
  Assert<DoesNotAccept<Parameters<Effects["temp"]>[0], "missing_timer">>,
  Assert<DoesNotAccept<Parameters<CompleteGameContext["buy"]>[0], string>>,
  Assert<
    DoesNotAccept<
      Parameters<RuntimeContext["selectArchitecture"]>[0],
      "invalid_architecture"
    >
  >,
  Assert<
    DoesNotAccept<
      EventDefinition,
      {
        id: "brownout";
        kind: "INCIDENT";
        title: string;
        body: string;
        w: number;
        choices: [];
        fx: () => string;
      }
    >
  >,
];
