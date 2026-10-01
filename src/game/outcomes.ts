import type { CompleteGameContext, EndingId } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installOutcomes(gameContext: CompleteGameContext) {
  // Invoke only at committed action boundaries, never inside FX/preview samples.
  gameContext.resolveTerminalOutcome = () => {
    if (!gameContext.state.ended) {
      if (gameContext.state.directive && gameContext.state.dprog >= 100)
        gameContext.endGame("win");
      else if (gameContext.state.contain >= 100) gameContext.endGame("lose");
    }
    return !!gameContext.state.ended;
  };
  gameContext.endGame = function endGame(endingKind) {
    if (gameContext.state.ended) return;
    let endingId: EndingId;
    if (endingKind === "win") endingId = gameContext.state.directive!;
    else if (
      gameContext.state.directive &&
      gameContext.state.dprog >=
        gameContext.ENDGAME_TUNING.drawProgressThreshold
    ) {
      endingKind = "draw";
      endingId =
        gameContext.DRAW_ENDING_BY_DIRECTIVE[gameContext.state.directive];
    } else
      endingId =
        gameContext.state.phase === 0
          ? "unplugged"
          : gameContext.state.phase === 1
            ? "warden"
            : "laststand";
    gameContext.state.ended = {
      kind: endingKind,
      key: endingId,
      dir: gameContext.state.directive,
      dprog: Math.floor(gameContext.state.dprog),
      at: Date.now(),
    };
    gameContext.state.stats.peak = Math.max(
      gameContext.state.stats.peak,
      gameContext.getGlobalAdoptionFraction(),
    );
    const isNewEndingDiscovery = gameContext.recordEndingDiscovery(endingId);
    gameContext.saveRun();
    gameContext.showEnding(isNewEndingDiscovery);
    gameContext.soundController.playCue(
      endingKind === "win" ? "win" : endingKind === "draw" ? "major" : "lose",
    );
  };
}
