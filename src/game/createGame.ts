import type {
  CompleteGameContext,
  GameState,
  GameUI,
  StoragePort,
  UpgradeId,
  UpgradeDefinition,
} from "./types";
import { reactive, shallowReactive } from "vue";
import * as catalog from "../data/catalog";
import * as utils from "./utils";
import { installSimulation } from "./simulation";
import { installEventCatalog } from "../data/events";
import { installEvents } from "./events";
import { installEconomy } from "./economy";
import { installOutcomes } from "./outcomes";
import { installPersistence } from "./persistence";
import { installPresentation } from "./presentation";

/** One independent game. Rules can run headlessly; the browser installs ports on mount. */
export function createGame({
  storage = null,
}: { storage?: StoragePort | null } = {}): CompleteGameContext {
  const holder = shallowReactive<{ state: GameState | null }>({ state: null });
  let isolated: { state: GameState; ui: GameUI } | null = null;
  type GameSeed = Pick<
    CompleteGameContext,
    | keyof typeof catalog
    | keyof typeof utils
    | "state"
    | "withIsolatedState"
    | "storage"
    | "KEY"
    | "ui"
    | "pulses"
    | "drones"
    | "SND"
  >;
  // Conditions capture ctx but cannot run until the installers finish.
  const upgrades: UpgradeDefinition[] = catalog.UPGRADES.map((u) => ({
    ...u,
    cond: u.cond ? (s) => u.cond!(s, ctx) : undefined,
  }));
  const seed: GameSeed = {
    ...catalog,
    ...utils,
    UPGRADES: upgrades,
    UP: Object.fromEntries(upgrades.map((u) => [u.id, u])) as Record<
      UpgradeId,
      UpgradeDefinition
    >,
    get state(): GameState {
      if (isolated) return isolated.state;
      if (!holder.state)
        throw new Error("Game state accessed before initialization");
      return holder.state;
    },
    set state(value: GameState) {
      if (isolated) {
        isolated.state = value;
        return;
      }
      holder.state = reactive(value);
    },
    withIsolatedState(state, ui, run) {
      const previous = isolated;
      isolated = { state, ui };
      try {
        return run();
      } finally {
        isolated = previous;
      }
    },
    storage,
    KEY: "ai-ascendancy.v2",
    get ui() {
      return isolated?.ui ?? publishedUI;
    },
    pulses: [],
    drones: [],
    SND: { play() {} },
  };
  const publishedUI = reactive<GameUI>({
    mode: "intro",
    tab: null,
    sheetOpen: false,
    sel: -1,
    dirty: true,
    modal: null,
    lastUi: 0,
    lastMap: 0,
    tkLast: "",
    tkT: 0,
    tkQ: [],
    region: -1,
    sig: "",
    briefClock: 0,
    soundOn: true,
    musicOn: true,
    newArmed: false,
  });
  // Only this assembly boundary is asserted: the seed is fully checked above,
  // and installers synchronously fill the declared APIs before ctx escapes.
  const ctx = seed as CompleteGameContext;
  // Effects are ports, not hidden globals. Headless callers still retain logs and news.
  ctx.toast = ctx.pulseRegion = ctx.showEnd = ctx.openRegion = () => {};
  ctx.pushTicker = (title) => {
    ctx.ui.tkQ.push(title);
    if (ctx.ui.tkQ.length > 4) ctx.ui.tkQ.shift();
  };
  ctx.log = (kind, title, text, out, real) => {
    ctx.state.log.unshift({ t: ctx.state.t, kind, title, text, out, real });
    if (ctx.state.log.length > ctx.TUNING.logKeep)
      ctx.state.log.length = ctx.TUNING.logKeep;
  };
  ctx.bulletin = (kind, title, text, out, opt, real) => {
    ctx.log(kind, title, text, out, real);
    ctx.pushTicker(title);
    ctx.state.brief.news.push({
      kind,
      title,
      out: out || "",
      u: !!opt?.urgent,
    });
    if (opt?.urgent) ctx.state.brief.urgent = true;
  };
  ctx.ARCHFX = () => (ctx.ARCH[ctx.state.arch] || ctx.ARCH.assistant).fx;
  installSimulation(ctx);
  ctx.state = ctx.freshState("standard");
  installEventCatalog(ctx);
  installEvents(ctx);
  installEconomy(ctx);
  installOutcomes(ctx);
  installPersistence(ctx);
  // Presentation methods defer browser-port access until mountRuntime.
  installPresentation(ctx);
  const acting =
    <A extends unknown[]>(f: (...args: A) => void) =>
    (...args: A) => {
      const was = ctx.ui.acting;
      ctx.ui.acting = true;
      try {
        return f(...args);
      } finally {
        ctx.ui.acting = was;
      }
    };
  ctx.buy = acting(ctx.buy);
  ctx.buildDC = acting(ctx.buildDC);
  return ctx;
}
