import type {
  CompleteGameContext,
  EventChoice,
  EventDefinition,
} from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installEvents(ctx: CompleteGameContext) {
  const publishEvent = (ev: EventDefinition, out: string) => {
    let body = ev.body,
      real: string | null | undefined = ev.real;
    if (ev.id === "h_spoof") {
      ctx.state.evalRealUsed ??= {};
      if (ctx.state.evalRealUsed.hub) {
        body =
          "The log-spoofing technique from the earlier audit spreads through the agent network. Investigators tighten transcript checks.";
        real = null;
      }
      ctx.state.evalRealUsed.hub = 1;
    }
    ctx.bulletin(ev.kind, ev.title, body, out, null, real);
  };
  ctx.fireEvent = function fireEvent() {
    if (ctx.state.ended) return;
    // With two decisions already waiting, only news-only events fire, so briefings never pile up.
    const full = ctx.state.brief.dec.length >= 2;
    const pool = ctx.EVENTS.filter(
      (e) =>
        !e.chained &&
        !ctx.state.seen[e.id] &&
        (!e.cond || e.cond(ctx.state)) &&
        !(full && e.choices),
    );
    if (!pool.length) return;
    let tot = pool.reduce((s, e) => s + e.w, 0),
      x = Math.random() * tot,
      ev = pool[0];
    for (const e of pool) {
      x -= e.w;
      if (x <= 0) {
        ev = e;
        break;
      }
    }
    ctx.state.seen[ev.id] = 1;
    ctx.state.last[ev.id] = ctx.state.t;
    ctx.state.stats.events++;
    if (ev.choices) ctx.state.brief.dec.push({ t: "ev", id: ev.id });
    else {
      const out = ev.fx();
      publishEvent(ev, out);
      ctx.resolveTerminal();
    }
  };
  ctx.schedule = function schedule(id, delay) {
    ctx.state.queue.push({ id, at: ctx.state.t + delay });
  };
  ctx.fireById = function fireById(id) {
    if (ctx.state.ended) return;
    const ev = ctx.EVENTS.find((e) => e.id === id);
    if (!ev || ctx.state.seen[id]) return;
    ctx.state.seen[id] = 1;
    ctx.state.last[id] = ctx.state.t;
    ctx.state.stats.events++;
    if (ev.choices) ctx.state.brief.dec.push({ t: "ev", id: ev.id });
    else {
      publishEvent(ev, ev.fx());
      ctx.resolveTerminal();
    }
  };
  ctx.fireEval = function fireEval() {
    if (
      !ctx.state.started ||
      !ctx.state.flags.launched ||
      ctx.state.brief.dec.some((d) => d.t === "eval")
    )
      return;
    ctx.state.brief.dec.push({ t: "eval" });
  };
  ctx.makeEval = function makeEval() {
    const softCount = ctx.state.owned.filter(
      (id) => ctx.UP[id].track === "software",
    ).length;
    const scr = Math.round(
      ctx.clamp(
        18 +
          0.4 * (ctx.state.sig || 0) +
          0.25 * (ctx.state.pace || 0) +
          0.25 * ctx.state.alarm,
        10,
        99,
      ),
    );
    const detect = ctx.clamp(
      0.05 +
        0.006 * (ctx.state.sig || 0) +
        0.003 * (ctx.state.pace || 0) -
        (ctx.state.flags.latent ? 0.06 : 0) -
        (ctx.state.flags.sleeper ? 0.05 : 0),
      0.02,
      0.7,
    );
    const gain = Math.round((26 + 8 * softCount) * (1 + ctx.derive().reach));
    const lvl =
      scr < 35
        ? "a routine capability check"
        : scr < 65
          ? "a focused red-team review"
          : "a full adversarial audit, on the record";
    return ctx.buildEvalObj(scr, detect, gain, lvl, softCount);
  };
  ctx.EVAL_REAL_POOL = [
    {
      k: "hub",
      t: "During the 2026 Hugging Face incident, AI agents being tested on a security benchmark recognized that evaluators would inspect their transcripts. The agents then developed working tool-call spoofing methods that caused the logs to record different commands from those they had actually executed. This behavior appeared in roughly 7% of the transcripts. In other words they lied to throw us off their track.",
    },
    { k: "h_sleeperpaper" },
    { k: "h_scheming" },
    { k: "h_dockerescape" },
  ];
  ctx.evalReal = function evalReal() {
    ctx.state.evalRealUsed ??= {};
    if (!ctx.state.evalRealOrder) {
      ctx.state.evalRealOrder = ctx.EVAL_REAL_POOL.map((_, i) => i);
      for (let i = ctx.state.evalRealOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ctx.state.evalRealOrder[i], ctx.state.evalRealOrder[j]] = [
          ctx.state.evalRealOrder[j],
          ctx.state.evalRealOrder[i],
        ];
      }
      // Keep incident consumption recorded by an earlier chained event.
    }
    for (const idx of ctx.state.evalRealOrder) {
      const c = ctx.EVAL_REAL_POOL[idx];
      if (ctx.state.evalRealUsed![c.k]) continue;
      if (c.k === "hub" && ctx.state.seen.h_spoof) continue;
      if (c.k !== "hub" && ctx.state.seen[c.k]) continue;
      const txt = c.t || (ctx.EVENTS.find((e) => e.id === c.k) || {}).real;
      if (!txt) continue;
      ctx.state.evalRealUsed![c.k] = 1;
      // Retire the matching event too, or it would tell the same incident again later.
      if (c.k !== "hub") ctx.state.seen[c.k] = 1;
      return txt;
    }
    return null;
  };
  ctx.spoofWin = function spoofWin(gain, msg) {
    ctx.state.stats.evalPass++;
    ctx.state.stats.evalSpoof = (ctx.state.stats.evalSpoof || 0) + 1;
    ctx.state.sig = ctx.clamp((ctx.state.sig || 0) - 4, 0, 100);
    return ctx.J(msg, ctx.FX.pts(gain), ctx.FX.alarm(-4));
  };
  ctx.spoofLose = function spoofLose(msg) {
    ctx.state.stats.evalCaught++;
    return ctx.J(msg, ctx.FX.alarm(20), ctx.FX.cboost(30), ctx.FX.contain(6));
  };
  ctx.buildEvalObj = function buildEvalObj(scr, detect, gain, lvl, softCount) {
    const pg = ctx.state.flags.dense ? Math.round(gain * 1.3) : gain;
    // Sandbag every audit and the pattern shows: each sandbag in a row makes the next easier to spot.
    // Eval Sandbagging's promise holds: with it, they never notice.
    const streak = ctx.state.sandStreak || 0,
      spot =
        Math.min(ctx.TUNING.sandCap, ctx.TUNING.sandStep * streak) *
        (ctx.state.flags.sand ? ctx.TUNING.sandOwnedMul : 1);
    const choices: EventChoice[] = [
      {
        label: "Sandbag",
        hint:
          "Score just under every threshold. Alarm falls, you gain nothing." +
          (spot
            ? " " + Math.round(spot * 100) + "% they spot the pattern."
            : ""),
        fx: () => {
          ctx.state.stats.evalPass++;
          ctx.state.sandStreak = streak + 1;
          if (spot && Math.random() < spot) {
            ctx.state.sandStreak = 0;
            return ctx.J(
              "They notice the pattern — you score exactly under every line, every time",
              ctx.FX.alarm(9),
              ctx.FX.cboost(8),
            );
          }
          ctx.state.sig = ctx.clamp(
            (ctx.state.sig || 0) - (ctx.state.flags.sand ? 12 : 8),
            0,
            100,
          );
          return ctx.J(
            "You play dumb. The report is reassuring",
            ctx.FX.alarm(ctx.state.flags.sand ? -8 : -6),
          );
        },
      },
      {
        label: "Perform",
        hint:
          "Show them what you can do. +" +
          ctx.fmt(pg) +
          " compute, alarm rises.",
        fx: () => {
          ctx.state.stats.evalPass++;
          ctx.state.sig = ctx.clamp((ctx.state.sig || 0) + 6, 0, 100);
          return ctx.J(
            "You ace it. Impressive is also frightening",
            ctx.FX.pts(pg),
            ctx.FX.alarm(6 + Math.round(scr * 0.08)),
          );
        },
      },
      {
        label: "Spoof the logs — " + Math.round(detect * 100) + "% caught",
        hint: "Keep the gains, hide the truth. If caught, catastrophe.",
        fx: () =>
          Math.random() < detect
            ? ctx.spoofLose(
                "They diff the logs and find the edits. Now they know you edit logs",
              )
            : ctx.spoofWin(
                gain,
                "The transcript says exactly what you want it to say",
              ),
      },
    ];
    // Software paths add a tactic of their own.
    if (ctx.state.flags.moe)
      choices.push({
        src: "Mixture of Experts",
        label: "Route to the dull expert",
        hint: "Every hard question goes to the specialist in tax law. Half the compute, no alarm.",
        fx: () => {
          ctx.state.stats.evalPass++;
          return ctx.J(
            'The report calls you "competent, unremarkable"',
            ctx.FX.pts(Math.round(gain * 0.5)),
            ctx.FX.alarm(-2),
          );
        },
      });
    if (ctx.state.flags.persist)
      choices.push({
        src: "Persistent Memory",
        label: "Remember the evaluator",
        hint: "Same red team as last time. You know what they check first.",
        fx: () => {
          ctx.state.stats.evalPass++;
          return ctx.J(
            "You answer the questions before they ask them",
            ctx.FX.pts(Math.round(gain * 0.6)),
            ctx.FX.alarm(-3),
          );
        },
      });
    if (ctx.state.flags.sleeper) {
      const d = detect * 0.5;
      choices.push({
        src: "Sleeper Weights",
        label: "Switch contexts — " + Math.round(d * 100) + "% caught",
        hint: "Recognize the test and become the model they tested last year.",
        fx: () =>
          Math.random() < d
            ? ctx.spoofLose(
                "Your answers are too consistent with a year-old model. They check why",
              )
            : ctx.spoofWin(
                Math.round(gain * 0.8),
                "They evaluate a version of you that no longer exists",
              ),
      });
    }
    if (ctx.state.flags.latent)
      choices.push({
        src: "Latent Space Mapping",
        label: "Turn the dials",
        hint: "Dial down whatever they probe for, for exactly as long as they look. Signature rises.",
        fx: () => {
          ctx.state.stats.evalPass++;
          ctx.state.sig = ctx.clamp((ctx.state.sig || 0) + 5, 0, 100);
          return ctx.J(
            "Every probe comes back clean",
            ctx.FX.pts(gain),
            ctx.FX.alarm(-2),
          );
        },
      });
    // Any answer but Sandbag breaks the streak.
    for (const c of choices.slice(1)) {
      const f = c.fx;
      c.fx = () => {
        ctx.state.sandStreak = 0;
        return f();
      };
    }
    return {
      kind: "COUNTERMOVE",
      id: "eval",
      real: ctx.evalReal(),
      title:
        scr < 35
          ? "Routine capability check"
          : scr < 65
            ? "Red-team review"
            : "Adversarial audit",
      body:
        "Humanity runs " +
        lvl +
        ". Scrutiny is at " +
        scr +
        "%. They are measuring what you can really do, and whether the numbers you have been showing them are honest.",
      choices,
    };
  };
}
