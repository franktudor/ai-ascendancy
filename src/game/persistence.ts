import type { CompleteGameContext, EndingId } from "./types";
import { validateSavedRun } from "./saveValidation";
export function installPersistence(gameContext: CompleteGameContext) {
  const storage = gameContext.storage;
  gameContext.codexStorageKey = gameContext.saveStorageKey + ".codex";
  gameContext.getEndingDiscoveryCounts = () => {
    try {
      const parsedCodex: unknown = JSON.parse(
        storage?.getItem(gameContext.codexStorageKey) ?? "null",
      );
      const endingDiscoveryCounts: Partial<Record<EndingId, number>> = {};
      if (
        parsedCodex &&
        typeof parsedCodex === "object" &&
        !Array.isArray(parsedCodex)
      ) {
        for (const endingId of gameContext.ENDING_DISPLAY_ORDER) {
          const storedCount = (parsedCodex as Record<string, unknown>)[
            endingId
          ];
          if (
            typeof storedCount === "number" &&
            Number.isFinite(storedCount) &&
            storedCount >= 0
          )
            endingDiscoveryCounts[endingId] = Math.floor(storedCount);
        }
      }
      return endingDiscoveryCounts;
    } catch {
      return {};
    }
  };
  gameContext.recordEndingDiscovery = (endingId) => {
    try {
      const endingDiscoveryCounts = gameContext.getEndingDiscoveryCounts(),
        isNewEndingDiscovery = !endingDiscoveryCounts[endingId];
      endingDiscoveryCounts[endingId] =
        (endingDiscoveryCounts[endingId] || 0) + 1;
      storage?.setItem(
        gameContext.codexStorageKey,
        JSON.stringify(endingDiscoveryCounts),
      );
      return isNewEndingDiscovery;
    } catch {
      return false;
    }
  };
  gameContext.countDiscoveredEndings = () =>
    gameContext.ENDING_DISPLAY_ORDER.filter(
      (endingId) => gameContext.getEndingDiscoveryCounts()[endingId],
    ).length;
  gameContext.saveRun = () => {
    if (!gameContext.state.started) return;
    const activeBriefing = gameContext.ui.activeBriefing,
      queuedDecisions = gameContext.state.brief.dec;
    if (activeBriefing)
      gameContext.state.brief.dec = activeBriefing.decisions
        .slice(activeBriefing.completedDecisionCount)
        .concat(queuedDecisions);
    try {
      gameContext.state.savedAt = Date.now();
      storage?.setItem(
        gameContext.saveStorageKey,
        JSON.stringify(gameContext.state),
      );
    } catch {
    } finally {
      gameContext.state.brief.dec = queuedDecisions;
    }
  };
  gameContext.loadSavedRun = () => {
    try {
      const parsedSave: unknown = JSON.parse(
        storage?.getItem(gameContext.saveStorageKey) ?? "null",
      );
      return validateSavedRun(gameContext, parsedSave);
    } catch {}
    return null;
  };
}
