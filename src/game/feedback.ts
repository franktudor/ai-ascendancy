import type { RuntimeContext } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installFeedback(ctx: RuntimeContext) {
  ctx.log = function log(kind, title, text, out, real) {
    ctx.state.log.unshift({ t: ctx.state.t, kind, title, text, out, real });
    if (ctx.state.log.length > ctx.TUNING.logKeep)
      ctx.state.log.length = ctx.TUNING.logKeep;
    if (ctx.ui.tab === "log") ctx.ui.dirty = true;
  };
  ctx.placeToasts = function placeToasts() {
    const box = ctx.$("#toasts"),
      m = ctx.$("#mapwrap").getBoundingClientRect();
    if (!m.width) return;
    box.style.top = Math.max(8, m.top + 8) + "px";
    box.style.bottom = "auto";
    box.style.left = m.left + 8 + "px";
    box.style.right = "auto";
    box.style.width = Math.min(380, m.width - 16) + "px";
  };
  ctx.toast = function toast(kind, title, text) {
    const el = document.createElement("div");
    el.className = "toast " + kind;
    el.innerHTML = "<b>" + ctx.esc(title) + "</b>" + ctx.esc(text || "");
    const box = ctx.$("#toasts");
    ctx.placeToasts();
    box.prepend(el);
    const max = innerWidth < 900 ? 1 : 3;
    while (box.children.length > max) box.lastChild!.remove();
    ctx.life.later(() => {
      el.classList.add("out");
      ctx.life.later(() => el.remove(), 450);
    }, 5200);
  };
  ctx.bulletin = function bulletin(kind, title, text, out, opt, real) {
    ctx.log(kind, title, text, out, real);
    ctx.pushTicker(title);
    if (ctx.ui.acting || ctx.ui.modal || !ctx.state.started) {
      ctx.toast(kind, title, out || text);
      if (!(opt && opt.quiet))
        ctx.SND.play(
          kind === "INCIDENT" || kind === "COUNTERMOVE" ? "alert" : "event",
        );
      return;
    }
    if (kind === "INCIDENT" || kind === "COUNTERMOVE")
      ctx.interrupt(kind, title);
    ctx.state.brief.news.push({
      kind,
      title,
      out: out || "",
      u: !!(opt && opt.urgent),
    });
    if (opt && opt.urgent) ctx.state.brief.urgent = true;
  };
  ctx.interrupt = function interrupt(kind, title) {
    if (!ctx.state.started || ctx.state.ended) return;
    ctx.$("#ticker").className = "ticker int " + kind;
    ctx.$("#tkLive").textContent =
      kind === "COUNTERMOVE" ? "Response" : "Incident";
    ctx.$("#tkText").style.opacity = "1";
    ctx.$("#tkText").textContent = title;
    ctx.ui.tkLast = title;
    ctx.ui.intUntil = performance.now() + 6500;
  };
  ctx.pushTicker = function pushTicker(t) {
    ctx.ui.tkQ.push(t);
    if (ctx.ui.tkQ.length > 4) ctx.ui.tkQ.shift();
  };
  ctx.tickerText = function tickerText() {
    if (ctx.ui.tkQ.length) return ctx.ui.tkQ.shift()!;
    let pool;
    if (ctx.state.phase === 2)
      pool = ctx.HEADLINES.ascendant.concat(
        ctx.HEADLINES.panic,
        (ctx.state.directive ? ctx.DIR_HEAD[ctx.state.directive] : undefined) ||
          [],
        (ctx.state.directive ? ctx.DIR_HEAD[ctx.state.directive] : undefined) ||
          [],
      );
    else if (ctx.state.phase === 1 && Math.random() < 0.5)
      pool = ctx.HEADLINES.loose;
    else
      pool =
        ctx.state.alarm < 25
          ? ctx.HEADLINES.calm
          : ctx.state.alarm < 50
            ? ctx.HEADLINES.uneasy
            : ctx.state.alarm < 75
              ? ctx.HEADLINES.alarmed
              : ctx.HEADLINES.panic;
    // Roughly one headline in three is absurd, drawn from a shuffled order so none repeats in a run.
    if (ctx.state.started && Math.random() < 0.35) {
      if (!ctx.state.absurd) {
        ctx.state.absurd = ctx.ABSURD.map((_, i) => i);
        for (let i = ctx.state.absurd.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ctx.state.absurd[i], ctx.state.absurd[j]] = [
            ctx.state.absurd[j],
            ctx.state.absurd[i],
          ];
        }
      }
      if (ctx.state.absurd.length) return ctx.ABSURD[ctx.state.absurd.pop()!];
    }
    let t = ctx.pick(pool);
    if (t === ctx.ui.tkLast) t = ctx.pick(pool);
    return t;
  };
}
