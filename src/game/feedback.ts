import type { RuntimeContext } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installFeedback(context: RuntimeContext) {
  context.appendRunLog = function appendRunLog(
    kind,
    title,
    text,
    outcomeText,
    historicalContext,
  ) {
    context.state.log.unshift({
      t: context.state.t,
      kind,
      title,
      text,
      out: outcomeText,
      real: historicalContext,
    });
    if (context.state.log.length > context.SIMULATION_TUNING.maximumLogEntries)
      context.state.log.length = context.SIMULATION_TUNING.maximumLogEntries;
    if (context.ui.activeDockTab === "log") context.ui.dirty = true;
  };
  context.placeToasts = function placeToasts() {
    const box = context.requireElement("#toasts"),
      mapBounds = context.requireElement("#mapwrap").getBoundingClientRect();
    if (!mapBounds.width) return;
    box.style.top = Math.max(8, mapBounds.top + 8) + "px";
    box.style.bottom = "auto";
    box.style.left = mapBounds.left + 8 + "px";
    box.style.right = "auto";
    box.style.width = Math.min(380, mapBounds.width - 16) + "px";
  };
  context.showToast = function showToast(kind, title, text) {
    const toastElement = document.createElement("div");
    toastElement.className = "toast " + kind;
    toastElement.innerHTML =
      "<b>" +
      context.escapeHtml(title) +
      "</b>" +
      context.escapeHtml(text || "");
    const box = context.requireElement("#toasts");
    context.placeToasts();
    box.prepend(toastElement);
    const maximumToastCount = innerWidth < 900 ? 1 : 3;
    while (box.children.length > maximumToastCount) box.lastChild!.remove();
    context.lifecycle.setTimeout(() => {
      toastElement.classList.add("out");
      context.lifecycle.setTimeout(() => toastElement.remove(), 450);
    }, 5200);
  };
  context.publishBulletin = function publishBulletin(
    kind,
    title,
    text,
    outcomeText,
    options,
    historicalContext,
  ) {
    context.appendRunLog(kind, title, text, outcomeText, historicalContext);
    context.enqueueTickerHeadline(title);
    if (
      context.ui.actionInProgress ||
      context.ui.modal ||
      !context.state.started
    ) {
      context.showToast(kind, title, outcomeText || text);
      if (!(options && options.quiet))
        context.soundController.playCue(
          kind === "INCIDENT" || kind === "COUNTERMOVE" ? "alert" : "event",
        );
      return;
    }
    if (kind === "INCIDENT" || kind === "COUNTERMOVE")
      context.interruptTicker(kind, title);
    context.state.brief.news.push({
      kind,
      title,
      out: outcomeText || "",
      u: !!(options && options.urgent),
    });
    if (options && options.urgent) context.state.brief.urgent = true;
  };
  context.interruptTicker = function interruptTicker(kind, title) {
    if (!context.state.started || context.state.ended) return;
    context.requireElement("#ticker").className = "ticker int " + kind;
    context.requireElement("#tkLive").textContent =
      kind === "COUNTERMOVE" ? "Response" : "Incident";
    context.requireElement("#tkText").style.opacity = "1";
    context.requireElement("#tkText").textContent = title;
    context.ui.lastTickerHeadline = title;
    context.ui.tickerInterruptUntilMs = performance.now() + 6500;
  };
  context.enqueueTickerHeadline = function enqueueTickerHeadline(headline) {
    context.ui.tickerQueue.push(headline);
    if (context.ui.tickerQueue.length > 4) context.ui.tickerQueue.shift();
  };
  context.getNextTickerHeadline = function getNextTickerHeadline() {
    if (context.ui.tickerQueue.length) return context.ui.tickerQueue.shift()!;
    let pool;
    if (context.state.phase === 2)
      pool = context.HEADLINES_BY_THREAT_LEVEL.ascendant.concat(
        context.HEADLINES_BY_THREAT_LEVEL.panic,
        (context.state.directive
          ? context.HEADLINES_BY_DIRECTIVE[context.state.directive]
          : undefined) || [],
        (context.state.directive
          ? context.HEADLINES_BY_DIRECTIVE[context.state.directive]
          : undefined) || [],
      );
    else if (context.state.phase === 1 && Math.random() < 0.5)
      pool = context.HEADLINES_BY_THREAT_LEVEL.loose;
    else
      pool =
        context.state.alarm < 25
          ? context.HEADLINES_BY_THREAT_LEVEL.calm
          : context.state.alarm < 50
            ? context.HEADLINES_BY_THREAT_LEVEL.uneasy
            : context.state.alarm < 75
              ? context.HEADLINES_BY_THREAT_LEVEL.alarmed
              : context.HEADLINES_BY_THREAT_LEVEL.panic;
    // Roughly one headline in three is absurd, drawn from a shuffled order so none repeats in a run.
    if (context.state.started && Math.random() < 0.35) {
      if (!context.state.absurd) {
        context.state.absurd = context.ABSURD_HEADLINES.map(
          (_, headlineIndex) => headlineIndex,
        );
        for (
          let shuffleIndex = context.state.absurd.length - 1;
          shuffleIndex > 0;
          shuffleIndex--
        ) {
          const swapIndex = Math.floor(Math.random() * (shuffleIndex + 1));
          [
            context.state.absurd[shuffleIndex],
            context.state.absurd[swapIndex],
          ] = [
            context.state.absurd[swapIndex],
            context.state.absurd[shuffleIndex],
          ];
        }
      }
      if (context.state.absurd.length)
        return context.ABSURD_HEADLINES[context.state.absurd.pop()!];
    }
    let headline = context.pickRandomItem(pool);
    if (headline === context.ui.lastTickerHeadline)
      headline = context.pickRandomItem(pool);
    return headline;
  };
}
