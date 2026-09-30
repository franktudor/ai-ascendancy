import { inject, type InjectionKey } from "vue";
import type { RuntimeContext } from "./types";

export const gameContextInjectionKey: InjectionKey<RuntimeContext> =
  Symbol("game");
export function useGameContext(): RuntimeContext {
  const game = inject(gameContextInjectionKey);
  if (!game) throw new Error("Game components require the game provider");
  return game;
}
