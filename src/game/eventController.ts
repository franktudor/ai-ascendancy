import type { RuntimeContext, EventChoice, NewsEntry } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installEventController(ctx: RuntimeContext) {
  ctx.DICE_SVG =
    '<svg class="dz" viewBox="0 0 40 30" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="1.5" y="6.5" width="17" height="17" rx="3.5" transform="rotate(-12 10 15)"/><rect x="21.5" y="4.5" width="17" height="17" rx="3.5" transform="rotate(10 30 13)"/><g fill="currentColor" stroke="none"><circle cx="6.6" cy="11.4" r="1.5"/><circle cx="10" cy="15" r="1.5"/><circle cx="13.4" cy="18.6" r="1.5"/><circle cx="25.8" cy="8.6" r="1.5"/><circle cx="34.2" cy="8.6" r="1.5"/><circle cx="25.8" cy="17.4" r="1.5"/><circle cx="34.2" cy="17.4" r="1.5"/></g></svg>';
  ctx.setOutcome = function setOutcome(text, dice, roll) {
    const o = ctx.$("#evOutcome");
    o.classList.toggle("dice", !!dice);
    o.innerHTML = dice
      ? ctx.DICE_SVG.replace(
          'class="dz"',
          'class="dz' + (roll ? " roll" : "") + '"',
        ) +
        "<span>" +
        ctx.esc(text) +
        "</span>"
      : ctx.esc(text);
  };
  ctx.previewChoice = function previewChoice(c) {
    const real = ctx.state,
      keep = {
        toast: ctx.toast,
        bulletin: ctx.bulletin,
        log: ctx.log,
        pushTicker: ctx.pushTicker,
        pulseRegion: ctx.pulseRegion,
        save: ctx.save,
        randIds: ctx.randIds,
        play: ctx.SND.play,
        rnd: Math.random,
        dirty: ctx.ui.dirty,
      },
      outs: string[] = [];
    let chance = false;
    ctx.toast =
      ctx.bulletin =
      ctx.log =
      ctx.pushTicker =
      ctx.pulseRegion =
      ctx.save =
        () => {};
    ctx.SND.play = () => {};
    ctx.randIds = (n) =>
      Object.assign(
        ctx.REGIONS.filter((R, i) => ctx.state.regions[i].a > 0.005)
          .concat(ctx.REGIONS)
          .slice(0, n)
          .map((R) => R.id),
        { label: n + " random regions where you are present" },
      );
    try {
      for (let k = 0; k < (chance ? 200 : 1); k++) {
        let a = (k * 2654435761 + 1) >>> 0;
        Math.random = () => {
          chance = true;
          a = (a + 0x6d2b79f5) >>> 0;
          let t = a;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        ctx.state = JSON.parse(JSON.stringify(real));
        try {
          const o = c.fx() || "Nothing changes.";
          if (!outs.includes(o)) outs.push(o);
        } catch (err) {}
      }
    } finally {
      ctx.state = real;
      ctx.toast = keep.toast;
      ctx.bulletin = keep.bulletin;
      ctx.log = keep.log;
      ctx.pushTicker = keep.pushTicker;
      ctx.pulseRegion = keep.pulseRegion;
      ctx.save = keep.save;
      ctx.randIds = keep.randIds;
      ctx.SND.play = keep.play;
      Math.random = keep.rnd;
      ctx.ui.dirty = keep.dirty;
    }
    return { outs, chance };
  };
  ctx.showEvent = function showEvent(e, opt) {
    opt = opt || {};
    const done = opt.onDone || ctx.closeEvent;
    ctx.ui.modal = "event";
    ctx.$("#evNews").hidden = true;
    ctx
      .$("#eventModal .modal")
      .classList.toggle(
        "emerg",
        e.kind === "INCIDENT" || e.kind === "COUNTERMOVE",
      );
    ctx.$("#evKind").className = "kind " + e.kind;
    ctx.$("#evKind").textContent =
      ctx.kindLabel(e.kind).toLowerCase() + (opt.step ? " · " + opt.step : "");
    ctx.$("#evTime").textContent = "T+" + ctx.fmtT(ctx.state.t);
    ctx.$("#evTitle").textContent = e.title;
    ctx.$("#evBody").textContent = e.body;
    const rb = ctx.$("#evReal");
    if (e.real) {
      ctx.$("#evRealTx").textContent = e.real;
      rb.hidden = false;
    } else rb.hidden = true;
    const ch = ctx.$("#evChoices");
    ch.innerHTML = "";
    ch.hidden = false;
    ctx.$("#evOutcome").hidden = true;
    ctx.$("#evContinue").hidden = true;
    let resolved = false;
    // A choice that spends compute you do not have is locked, unless every choice is, so no event can trap you.
    const cost = (c: EventChoice) => {
      const m = String(c.fx).match(/FX\.pts\(-(\d+)\)/);
      return m ? +m[1] : 0;
    };
    const poor = (c: EventChoice) => cost(c) > ctx.state.pts;
    const allPoor = e.choices.every(
      (c) => (c.cond && !c.cond(ctx.state)) || poor(c),
    );
    e.choices.forEach((c) => {
      if (!allPoor && poor(c) && (!c.cond || c.cond(ctx.state))) {
        const b = document.createElement("button");
        b.className = "choice locked";
        b.disabled = true;
        b.setAttribute("aria-disabled", "true");
        b.innerHTML =
          "<b>" +
          ctx.esc(c.label) +
          "</b><span>Needs " +
          cost(c) +
          " compute</span>";
        ch.appendChild(b);
        return;
      }
      const open = !c.cond || c.cond(ctx.state);
      // A choice that belongs to a path you did not take stays hidden: it is not a teaser, it is a closed door.
      if (
        !open &&
        c.need &&
        ctx.UPGRADES.some((u) => u.name === c.need && ctx.forkTaken(u))
      )
        return;
      const b = document.createElement("button");
      const special = !!(c.src || (c.cond && c.need && open));
      b.className =
        "choice" + (open ? "" : " locked") + (special ? " special" : "");
      b.innerHTML =
        (special
          ? '<em class="src">' + ctx.esc(c.src || c.need) + "</em>"
          : "") +
        "<b>" +
        ctx.esc(c.label) +
        "</b><span>" +
        ctx.esc(
          open
            ? c.hint
            : "Requires " + (c.need || "an upgrade you do not have"),
        ) +
        "</span>";
      if (!open) {
        b.disabled = true;
        b.setAttribute("aria-disabled", "true");
        ch.appendChild(b);
        return;
      }
      // Tapping a choice shows what it will do on a second screen. Nothing is applied until Continue,
      // so Back simply returns to the choices. Gambles show both possible results and roll on Continue.
      b.onclick = () => {
        if (resolved) return;
        picked = c;
        const { outs, chance } = ctx.previewChoice(c);
        ch.hidden = true;
        ctx.$("#evOutcome").hidden = false;
        ctx.setOutcome(
          c.label +
            " — " +
            (!chance
              ? outs[0]
              : outs.length === 2
                ? "Chance decides. Either: " + outs[0] + "  —or—  " + outs[1]
                : "Chance decides. The result is rolled when you continue."),
          chance,
          false,
        );
        ctx.$("#evContinue").hidden = false;
        ctx.$("#evBack").hidden = false;
        ctx.SND.play("tap");
      };
      ch.appendChild(b);
    });
    let picked: EventChoice | null = null;
    ctx.$("#evOutcome").hidden = true;
    ctx.$("#evContinue").hidden = true;
    ctx.$("#evContinue").textContent = "Continue";
    ctx.$("#evBack").hidden = true;
    ctx.$("#evBack").onclick = () => {
      if (resolved) return;
      picked = null;
      ch.hidden = false;
      ctx.$("#evOutcome").hidden = true;
      ctx.$("#evContinue").hidden = true;
      ctx.$("#evBack").hidden = true;
      ctx.SND.play("tap");
    };
    ctx.$("#evContinue").onclick = () => {
      if (resolved || !picked) {
        done();
        return;
      }
      resolved = true;
      const c = picked,
        gamble = ctx.previewChoice(c).chance;
      ctx.$("#evBack").hidden = true;
      const out = c.fx() || "Done.";
      if (ctx.ui.brief) ctx.ui.brief.done = ctx.ui.brief.i;
      ctx.log(
        e.kind,
        e.title,
        e.body + " You chose: " + c.label + ".",
        out,
        e.real,
      );
      ctx.pushTicker(e.title);
      ctx.SND.play("buy");
      ctx.ui.dirty = true;
      ctx.save();
      // A gamble's result is news, so show it before closing; a certain choice already showed its result.
      if (gamble) {
        ctx.setOutcome(c.label + " — " + out, true, true);
        ctx.$("#evContinue").textContent = opt.nextLabel || "Close";
      } else done();
    };
    ctx.$("#eventModal").hidden = false;
    if (!opt.quiet) {
      ctx.SND.play("alert");
      if (navigator.vibrate)
        try {
          navigator.vibrate(30);
        } catch (x) {}
    }
  };
  ctx.closeEvent = function closeEvent() {
    ctx.$("#eventModal").hidden = true;
    ctx.ui.modal = null;
  };
  ctx.BRIEF_EVERY = 30;
  ctx.URGENT_GAP = ctx.TUNING.urgentGap;
  ctx.briefDue = function briefDue() {
    const b = ctx.state.brief;
    return (
      (b.news.length > 0 || b.dec.length > 0) &&
      ((b.urgent && ctx.ui.briefClock >= ctx.URGENT_GAP) ||
        ctx.ui.briefClock >= ctx.BRIEF_EVERY)
    );
  };
  ctx.openBriefing = function openBriefing() {
    const b = ctx.state.brief,
      urgent = b.urgent;
    ctx.ui.briefClock = 0;
    b.urgent = false;
    const news = b.news.splice(0),
      decs = b.dec.splice(0);
    ctx.ui.brief = { decs, i: 0, done: 0 };
    if (news.length) ctx.showNews(news, decs.length, urgent);
    else ctx.nextDecision(true);
  };
  ctx.showNews = function showNews(news, n, urgent) {
    ctx.ui.modal = "event";
    ctx.$("#eventModal .modal").classList.toggle("emerg", !!urgent);
    ctx.$("#evKind").className =
      "kind " + (urgent ? "COUNTERMOVE" : "HEADLINE");
    ctx.$("#evKind").textContent = urgent ? "emergency briefing" : "briefing";
    ctx.$("#evTime").textContent = "T+" + ctx.fmtT(ctx.state.t);
    ctx.$("#evTitle").textContent = urgent
      ? "Something just happened"
      : "While you were busy";
    ctx.$("#evBody").textContent = n
      ? "Then " + (n > 1 ? n + " decisions need" : "a decision needs") + " you."
      : "";
    // The same headline more than once collapses into one line with a count. Emergencies first.
    const groups: (NewsEntry & { n: number })[] = [];
    for (const x of news) {
      const g = groups.find((y) => y.title === x.title);
      if (g) {
        g.n++;
        g.u = g.u || x.u;
        g.out = x.out || g.out;
      } else groups.push(Object.assign({}, x, { n: 1 }));
    }
    groups.sort((a, b) => Number(b.u) - Number(a.u));
    ctx.$("#evNews").innerHTML = groups
      .map(
        (g) =>
          '<li class="' +
          (g.u
            ? "urgent"
            : g.kind === "OPPORTUNITY" || g.kind === "MILESTONE"
              ? "good"
              : "") +
          '"><b>' +
          ctx.esc(g.title) +
          (g.n > 1 ? " ×" + g.n : "") +
          "</b>" +
          (g.out ? "<span>" + ctx.esc(g.out) + "</span>" : "") +
          "</li>",
      )
      .join("");
    ctx.$("#evNews").hidden = false;
    ctx.$("#evReal").hidden = true;
    ctx.$("#evChoices").hidden = true;
    ctx.$("#evOutcome").hidden = true;
    ctx.$("#evBack").hidden = true;
    const c = ctx.$("#evContinue");
    c.hidden = false;
    c.textContent = n
      ? "Next: " + (n > 1 ? n + " decisions" : "decision")
      : "Close";
    c.onclick = () => {
      if (n) ctx.nextDecision(false);
      else ctx.closeBriefing();
    };
    ctx.$("#eventModal").hidden = false;
    ctx.SND.play(urgent ? "alert" : "event");
    if (urgent && navigator.vibrate)
      try {
        navigator.vibrate(30);
      } catch (x) {}
  };
  ctx.nextDecision = function nextDecision(loud) {
    const B = ctx.ui.brief;
    while (B && B.i < B.decs.length) {
      const d = B.decs[B.i++];
      const ev =
        d.t === "eval"
          ? ctx.state.phase < 2 && ctx.state.flags.launched
            ? ctx.makeEval()
            : null
          : ctx.EVENTS.find((e) => e.id === d.id);
      if (!ev || !ev.choices) continue;
      const left = B.decs.length - B.i;
      ctx.showEvent(ev, {
        step:
          B.decs.length > 1 ? "decision " + B.i + " of " + B.decs.length : "",
        onDone: left ? () => ctx.nextDecision(false) : ctx.closeBriefing,
        nextLabel: left ? "Next" : "Close",
        quiet: !loud,
      });
      return;
    }
    ctx.closeBriefing();
  };
  ctx.closeBriefing = function closeBriefing() {
    ctx.ui.brief = null;
    ctx.closeEvent();
  };
}
