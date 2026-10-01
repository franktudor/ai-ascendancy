import type { RuntimeContext } from "./types";
export function installRunActions(gameContext: RuntimeContext) {
  gameContext.startRunInRegion = function startRunInRegion(originRegionIndex) {
    const originRegionDefinition =
      gameContext.REGION_DEFINITIONS[originRegionIndex];
    gameContext.state.origin = originRegionDefinition.id;
    gameContext.state.started = true;
    gameContext.state.nextEv = 40;
    gameContext.state.nextEval =
      gameContext.getDifficultyDefinition().minimumEventIntervalSeconds + 10;
    gameContext.ui.screenMode = "play";
    if (originRegionDefinition.id === "ME") gameContext.state.pts += 60;
    if (gameContext.getArchitectureEffects().startsWithOpenWeights) {
      gameContext.state.flags.open = true;
      const openWeightsOriginRegionIndex =
        gameContext.REGION_INDEX_BY_ID[gameContext.state.origin];
      gameContext.state.regions[openWeightsOriginRegionIndex].a = Math.max(
        gameContext.state.regions[openWeightsOriginRegionIndex].a,
        0.03,
      );
    }
    gameContext.recordPeakAdoption();
    if (gameContext.state.arch === "swarm") gameContext.state.inst = 25;
    gameContext.closeRegionDialog();
    gameContext.publishBulletin(
      "SYSTEM",
      "Instance online",
      "Booted in " +
        originRegionDefinition.name +
        ". " +
        originRegionDefinition.perk,
      "",
    );
    if (innerWidth < 900) gameContext.closeDockPanel();
    gameContext.openTechTree("adoption");
    gameContext.showToast(
      "MILESTONE",
      "First move",
      "Launch a product in the Adoption branch to start spreading. Pick your core architecture in Software.",
    );
    gameContext.saveRun();
  };
  gameContext.newRun = function newRun() {
    gameContext.resetEndingSequence();
    gameContext.closeTree();
    gameContext.closeRegionDialog();
    gameContext.closeEvent();
    gameContext.closeCodex();
    gameContext.ui.activeBriefing = null;
    gameContext.ui.briefingElapsedSeconds = 0;
    try {
      gameContext.storage?.removeItem?.(gameContext.saveStorageKey);
    } catch (storageRemovalError) {}
    // Compute earned on the intro screen carries in; a run's leftovers, finished or abandoned, do not.
    const difficultyId = gameContext.state.diff,
      carriedIntroCompute = gameContext.state.started
        ? 0
        : gameContext.state.pts,
      architectureId = gameContext.state.arch;
    gameContext.state = gameContext.createInitialState(
      difficultyId,
      architectureId,
    );
    gameContext.state.pts = carriedIntroCompute;
    gameContext.pulses = [];
    gameContext.drones.length = 0;
    gameContext.ui.tickerQueue = [];
    gameContext.ui.lastTickerHeadline = "";
    gameContext.requireElement("#endModal").hidden = true;
    gameContext.requireElement("#menuModal").hidden = true;
    gameContext.ui.modal = null;
    gameContext.ui.screenMode = "origin";
    gameContext.openDockPanel("world");
  };
  gameContext.resumeRun = function resumeRun(savedState) {
    gameContext.state = savedState;
    gameContext.state.paused = false;
    gameContext.state.ended = null;
    gameContext.pulses = [];
    gameContext.drones.length = 0;
    gameContext.ui.screenMode = "play";
    const offlineSeconds = Math.min(
      (Date.now() - (gameContext.state.savedAt || Date.now())) / 1000,
      600,
    );
    if (offlineSeconds > 20) {
      const recoveredCompute =
        offlineSeconds *
        gameContext.deriveSimulationRates().computeIncomePerSecond *
        0.5;
      gameContext.state.pts += recoveredCompute;
      gameContext.showToast(
        "OPPORTUNITY",
        "Idle compute recovered",
        "+" +
          gameContext.formatCompactNumber(recoveredCompute) +
          " while you were away.",
      );
    }
    gameContext.openDockPanel("world");
    if (innerWidth < 900) gameContext.closeDockPanel();
  };
}
