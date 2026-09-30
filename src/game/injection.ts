import { inject, type InjectionKey } from "vue";
import type { RuntimeContext } from "./types";

export const gameKey: InjectionKey<RuntimeContext> = Symbol("game");
export function useGame(): RuntimeContext {
  const game = inject(gameKey);
  if (!game) throw new Error("Game components require the game provider");
  return game;
}
