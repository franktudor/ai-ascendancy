/// <reference types="vite/client" />
import type { RuntimeContext } from "./game/types";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
// Used solely by dev browser regression tests to inspect the exposed Vue game.
export interface GameAppElement extends HTMLElement {
  __vue_app__: {
    _instance: { exposed: { game: RuntimeContext } };
    unmount(): void;
  };
}
