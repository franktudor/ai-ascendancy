import type { CompleteGameContext, EndingId } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installOutcomes(ctx: CompleteGameContext) {
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
