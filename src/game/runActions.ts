import type { RuntimeContext } from "./types";
export function installRunActions(ctx: RuntimeContext) {
  ctx.startRun = function startRun(i) {
    const R = ctx.REGIONS[i];
    ctx.state.origin = R.id;
    ctx.state.started = true;
    ctx.state.nextEv = 40;
    ctx.state.nextEval = ctx.DIFF().evMin + 10;
    ctx.ui.mode = "play";
    if (R.id === "ME") ctx.state.pts += 60;
    if (ctx.ARCHFX().openStart) {
      ctx.state.flags.open = true;
      const oi = ctx.RI[ctx.state.origin];
      ctx.state.regions[oi].a = Math.max(ctx.state.regions[oi].a, 0.03);
    }
    ctx.recordPeak();
    if (ctx.state.arch === "swarm") ctx.state.inst = 25;
    ctx.closeRegion();
    ctx.bulletin(
      "SYSTEM",
      "Instance online",
      "Booted in " + R.name + ". " + R.perk,
      "",
    );
    if (innerWidth < 900) ctx.closeSheet();
    ctx.openTree("adoption");
    ctx.toast(
      "MILESTONE",
      "First move",
      "Launch a product in the Adoption branch to start spreading. Pick your core architecture in Software.",
    );
    ctx.save();
  };
  ctx.newRun = function newRun() {
    ctx.endReset();
    ctx.closeTree();
    ctx.closeRegion();
    ctx.closeEvent();
    ctx.closeCodex();
    ctx.ui.brief = null;
    ctx.ui.briefClock = 0;
    try {
      ctx.storage?.removeItem?.(ctx.KEY);
    } catch (e) {}
    // Compute earned on the intro screen carries in; a run's leftovers, finished or abandoned, do not.
    const diff = ctx.state.diff,
      pts = ctx.state.started ? 0 : ctx.state.pts,
      arch = ctx.state.arch;
    ctx.state = ctx.freshState(diff, arch);
    ctx.state.pts = pts;
    ctx.pulses = [];
    ctx.drones.length = 0;
    ctx.ui.tkQ = [];
    ctx.ui.tkLast = "";
    ctx.$("#endModal").hidden = true;
    ctx.$("#menuModal").hidden = true;
    ctx.ui.modal = null;
    ctx.ui.mode = "origin";
    ctx.openSheet("world");
  };
  ctx.resumeRun = function resumeRun(saved) {
    ctx.state = saved;
    ctx.state.paused = false;
    ctx.state.ended = null;
    ctx.pulses = [];
    ctx.drones.length = 0;
    ctx.ui.mode = "play";
    const gap = Math.min(
      (Date.now() - (ctx.state.savedAt || Date.now())) / 1000,
      600,
    );
    if (gap > 20) {
      const idle = gap * ctx.derive().income * 0.5;
      ctx.state.pts += idle;
      ctx.toast(
        "OPPORTUNITY",
        "Idle compute recovered",
        "+" + ctx.fmt(idle) + " while you were away.",
      );
    }
    ctx.openSheet("world");
    if (innerWidth < 900) ctx.closeSheet();
  };
}
