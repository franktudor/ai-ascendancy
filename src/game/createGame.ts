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
import * as utilities from "./utils";
import { installSimulation } from "./simulation";
import { assertGameAssembly } from "./assembly";
import type { GameAssemblySeed } from "./assembly";
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
  const gameStateHolder = shallowReactive<{ state: GameState | null }>({
    state: null,
  });
  let isolatedStateOverride: { state: GameState; ui: GameUI } | null = null;
  // Conditions capture ctx but cannot run until the installers finish.
  const contextualUpgrades: UpgradeDefinition[] =
    catalog.UPGRADE_DEFINITIONS.map((upgrade) => ({
      ...upgrade,
      isAvailable: upgrade.isAvailable
        ? (gameState) => upgrade.isAvailable!(gameState, gameContext)
        : undefined,
    }));
  const assemblySeed: GameAssemblySeed = {
    ...catalog,
    ...utilities,
    UPGRADE_DEFINITIONS: contextualUpgrades,
    UPGRADE_BY_ID: Object.fromEntries(
      contextualUpgrades.map((upgrade) => [upgrade.id, upgrade]),
    ) as Record<UpgradeId, UpgradeDefinition>,
    get state(): GameState {
      if (isolatedStateOverride) return isolatedStateOverride.state;
      if (!gameStateHolder.state)
        throw new Error("Game state accessed before initialization");
      return gameStateHolder.state;
    },
    set state(gameState: GameState) {
      if (isolatedStateOverride) {
        isolatedStateOverride.state = gameState;
        return;
      }
      gameStateHolder.state = reactive(gameState);
    },
    withIsolatedState(isolatedGameState, isolatedGameUi, runWithIsolatedState) {
      const previousIsolatedStateOverride = isolatedStateOverride;
      isolatedStateOverride = { state: isolatedGameState, ui: isolatedGameUi };
      try {
        return runWithIsolatedState();
      } finally {
        isolatedStateOverride = previousIsolatedStateOverride;
      }
    },
    storage,
    saveStorageKey: "ai-ascendancy.v2",
    get ui() {
      return isolatedStateOverride?.ui ?? publishedGameUi;
    },
    pulses: [],
    drones: [],
    soundController: { playCue() {} },
  };
  const publishedGameUi = reactive<GameUI>({
    screenMode: "intro",
    activeDockTab: null,
    isDockPanelOpen: false,
    selectedRegionIndex: -1,
    dirty: true,
    modal: null,
    lastUiUpdateAtMs: 0,
    lastMapDrawAtMs: 0,
    lastTickerHeadline: "",
    lastTickerUpdateAtMs: 0,
    tickerQueue: [],
    openRegionIndex: -1,
    sig: "",
    briefingElapsedSeconds: 0,
    isSoundEnabled: true,
    isMusicEnabled: true,
    isNewRunConfirmationArmed: false,
  });
  // Only this assembly boundary is asserted: the seed is fully checked above,
  // and installers synchronously fill the declared APIs before ctx escapes.
  const gameContext = assemblySeed as CompleteGameContext;
  // Effects are ports, not hidden globals. Headless callers still retain logs and news.
  gameContext.showToast =
    gameContext.pulseRegion =
    gameContext.showEnding =
    gameContext.openRegionDialog =
      () => {};
  gameContext.enqueueTickerHeadline = (title) => {
    gameContext.ui.tickerQueue.push(title);
    if (gameContext.ui.tickerQueue.length > 4)
      gameContext.ui.tickerQueue.shift();
  };
  gameContext.appendRunLog = (
    bulletinKind,
    title,
    bodyText,
    outcomeText,
    historicalContext,
  ) => {
    gameContext.state.log.unshift({
      t: gameContext.state.t,
      kind: bulletinKind,
      title,
      text: bodyText,
      out: outcomeText,
      real: historicalContext,
    });
    if (
      gameContext.state.log.length >
      gameContext.SIMULATION_TUNING.maximumLogEntries
    )
      gameContext.state.log.length =
        gameContext.SIMULATION_TUNING.maximumLogEntries;
  };
  gameContext.publishBulletin = (
    bulletinKind,
    title,
    bodyText,
    outcomeText,
    bulletinOptions,
    historicalContext,
  ) => {
    gameContext.appendRunLog(
      bulletinKind,
      title,
      bodyText,
      outcomeText,
      historicalContext,
    );
    gameContext.enqueueTickerHeadline(title);
    gameContext.state.brief.news.push({
      kind: bulletinKind,
      title,
      out: outcomeText || "",
      u: !!bulletinOptions?.urgent,
    });
    if (bulletinOptions?.urgent) gameContext.state.brief.urgent = true;
  };
  gameContext.getArchitectureEffects = () =>
    (
      gameContext.ARCHITECTURE_DEFINITIONS[gameContext.state.arch] ||
      gameContext.ARCHITECTURE_DEFINITIONS.assistant
    ).effects;
  installSimulation(gameContext);
  // freshState is consumed during construction, before the final escape guard.
  assertGameAssembly(gameContext, "installSimulation");
  gameContext.state = gameContext.createInitialState("standard");
  installEventCatalog(gameContext);
  installEvents(gameContext);
  installEconomy(gameContext);
  installOutcomes(gameContext);
  installPersistence(gameContext);
  // Presentation methods defer browser-port access until mountRuntime.
  installPresentation(gameContext);
  assertGameAssembly(gameContext);
  const withActionInProgress =
    <ActionArguments extends unknown[]>(
      action: (...actionArguments: ActionArguments) => void,
    ) =>
    (...actionArguments: ActionArguments) => {
      const wasActionInProgress = gameContext.ui.actionInProgress;
      gameContext.ui.actionInProgress = true;
      try {
        return action(...actionArguments);
      } finally {
        gameContext.ui.actionInProgress = wasActionInProgress;
      }
    };
  gameContext.purchaseUpgrade = withActionInProgress(
    gameContext.purchaseUpgrade,
  );
  gameContext.buildDataCenter = withActionInProgress(
    gameContext.buildDataCenter,
  );
  return gameContext;
}
