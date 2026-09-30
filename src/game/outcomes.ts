import type { CompleteGameContext, EndingId } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installOutcomes(ctx: CompleteGameContext) {
  // Invoke only at committed action boundaries, never inside FX/preview samples.
  ctx.resolveTerminal = () => {
    if (!ctx.state.ended) {
      if (ctx.state.directive && ctx.state.dprog >= 100) ctx.endGame("win");
      else if (ctx.state.contain >= 100) ctx.endGame("lose");
    }
    return !!ctx.state.ended;
  };
  ctx.endGame = function endGame(kind) {
    if (ctx.state.ended) return;
    let key: EndingId;
    if (kind === "win") key = ctx.state.directive!;
    else if (ctx.state.directive && ctx.state.dprog >= ctx.ENDGAME.photo) {
      kind = "draw";
      key = ctx.DRAWS[ctx.state.directive];
    } else
      key =
        ctx.state.phase === 0
          ? "unplugged"
          : ctx.state.phase === 1
            ? "warden"
            : "laststand";
    ctx.state.ended = {
      kind,
      key,
      dir: ctx.state.directive,
      dprog: Math.floor(ctx.state.dprog),
      at: Date.now(),
    };
    ctx.state.stats.peak = Math.max(ctx.state.stats.peak, ctx.reach());
    const fresh = ctx.codexAdd(key);
    ctx.save();
    ctx.showEnd(fresh);
    ctx.SND.play(kind === "win" ? "win" : kind === "draw" ? "major" : "lose");
  };
}
