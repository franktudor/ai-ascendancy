import type {
  CompleteGameContext,
  PresentationBrowserPorts,
  TrackId,
  RGB,
} from "./types";
export function installPresentation(
  ctx: CompleteGameContext,
  browser?: PresentationBrowserPorts,
): void {
  // Headless presentation helpers work immediately. DOM/color methods require
  // the explicit browser port supplied only by mountRuntime.
  const ports = (): PresentationBrowserPorts => {
    if (!browser)
      throw new Error("Browser presentation requires a mounted runtime");
    return browser;
  };
  ctx.codexHTML = function codexHTML(current) {
    const c = ctx.codexGet();
    const grp = [
      ["win", "Victories"],
      ["draw", "Stalemates"],
      ["lose", "Defeats"],
    ];
    return grp
      .map(([kind, label]) => {
        const keys = ctx.END_ORDER.filter((k) => ctx.ENDINGS[k].kind === kind),
          n = keys.filter((k) => c[k]).length;
        return (
          '<div><div class="ch"><span>' +
          label +
          "</span><b>" +
          n +
          " / " +
          keys.length +
          '</b></div><div class="cx">' +
          keys
            .map((k) => {
              const E = ctx.ENDINGS[k],
                got = !!c[k];
              return (
                '<div class="cxi ' +
                kind +
                (got ? " rd" : " no") +
                (k === current ? " now" : "") +
                '"' +
                (got ? ' data-k="' + k + '" role="button" tabindex="0"' : "") +
                "><b>" +
                (got ? ctx.esc(E.title) : "???") +
                "</b><span>" +
                ctx.esc(E.hint) +
                (got && c[k]! > 1 ? " · ×" + c[k] : "") +
                "</span></div>"
              );
            })
            .join("") +
          "</div></div>"
        );
      })
      .join("");
  };
  ctx.openCodex = function openCodex() {
    ports().$("#codexFull").innerHTML = ctx.codexHTML(null);
    ports().$("#codexModal").hidden = false;
    ctx.ui.modal = ctx.ui.modal || "codex";
    ctx.SND.play("tap");
  };
  ctx.readEnding = function readEnding(k) {
    const E = ctx.ENDINGS[k];
    if (!E) return;
    if (ports().$("#codexModal").hidden) {
      ports().$("#codexFull").innerHTML = ctx.codexHTML(null);
      ports().$("#codexModal").hidden = false;
      ctx.ui.modal = ctx.ui.modal || "codex";
    }
    ports().$("#crTitle").textContent = E.title;
    ports().$("#crTitle").style.color =
      E.kind === "win"
        ? "var(--ai)"
        : E.kind === "draw"
          ? "var(--draw)"
          : "var(--human)";
    ports().$("#crHint").textContent = E.hint;
    const sp = ports().$("#crSpeech");
    sp.hidden = !E.speech;
    sp.innerHTML = E.speech
      ? E.speech.map((l) => "<p>" + ctx.esc(l) + "</p>").join("")
      : "";
    ports().$("#crText").textContent = E.text;
    ports().$("#codexList").hidden = true;
    ports().$("#codexRead").hidden = false;
    ports().$("#codexModal .modal").scrollTop = 0;
    ctx.SND.play("tap");
  };
  ctx.listEndings = function listEndings() {
    ports().$("#codexRead").hidden = true;
    ports().$("#codexList").hidden = false;
  };
  ctx.closeCodex = function closeCodex() {
    ctx.listEndings();
    ports().$("#codexModal").hidden = true;
    if (ctx.ui.modal === "codex") ctx.ui.modal = null;
  };
  ctx.threat = () =>
    ctx.state.alarm < 25
      ? [1, "Calm"]
      : ctx.state.alarm < 50
        ? [2, "Uneasy"]
        : ctx.state.alarm < 75
          ? [3, "Alarmed"]
          : [4, "Panic"];
  ctx.lonOf = (c) => ((c + 0.5) / ctx.MAP.cols) * 360 - 180;
  ctx.latOf = (r) => 84 - ((r + 0.5) * 144) / ctx.MAP.rows;
  ctx.latLon = (p) => {
    const la = ctx.latOf(p.r),
      lo = ctx.lonOf(p.c);
    return (
      Math.abs(la).toFixed(1) +
      (la >= 0 ? "N" : "S") +
      " " +
      String(Math.abs(lo).toFixed(1)).padStart(5, "0") +
      (lo >= 0 ? "E" : "W")
    );
  };
  ctx.ART = {
    key: "",
    rgb: [51, 255, 51],
    base: {
      ai: [51, 255, 51],
      dim: [17, 136, 17],
      line: [23, 58, 30],
      line2: [42, 102, 52],
    },
  };
  ctx.TRACK_RGB = {
    opinion: [255, 79, 216],
    adoption: [198, 255, 26],
    software: [46, 184, 255],
    hardware: [234, 246, 255],
  };
  ctx.buildTrack = function buildTrack() {
    const spend: Partial<Record<TrackId, number>> = {};
    let tot = 0,
      best: TrackId | null = null,
      bv = 0;
    for (const id of ctx.state.owned) {
      const u = ctx.UP[id];
      if (!u || u.dir) continue;
      spend[u.track] = (spend[u.track] || 0) + u.cost;
      tot += u.cost;
    }
    for (const k of Object.keys(spend) as TrackId[])
      if (spend[k]! > bv) {
        bv = spend[k]!;
        best = k;
      }
    return best && ctx.state.owned.length >= 4 && bv / tot >= 0.34
      ? best
      : null;
  };
  ctx.artDirection = function artDirection() {
    const phase =
      !ctx.state.started || ctx.state.phase === 0
        ? "early"
        : ctx.state.phase === 1
          ? "mid"
          : "late";
    const build = ctx.state.started ? ctx.buildTrack() : null;
    const take =
      !build || phase === "early"
        ? 0
        : phase === "mid"
          ? 0.22
          : 0.5 + 0.35 * ctx.clamp(ctx.state.dprog / 100, 0, 1);
    const key = phase + "|" + build + "|" + take.toFixed(2);
    if (key === ctx.ART.key) return;
    ctx.ART.key = key;
    const b = document.body.dataset;
    b.phase = phase;
    if (build) b.build = build;
    else delete b.build;
    const st = document.documentElement.style,
      B = ctx.ART.base;
    if (!take) {
      for (const n of ["--ai", "--ai2", "--ai-dim", "--line", "--line2"])
        st.removeProperty(n);
      ctx.ART.rgb = B.ai;
    } else {
      const T = ctx.TRACK_RGB[build!],
        set = (n: string, c: RGB) => st.setProperty(n, ports().rgb(c));
      ctx.ART.rgb = ports().lerp(B.ai, T, take);
      set("--ai", ctx.ART.rgb);
      set("--ai2", ports().lerp(ctx.ART.rgb, [255, 255, 255], 0.55));
      set("--ai-dim", ports().lerp(B.dim, T, take * 0.8));
      set(
        "--line",
        ports().lerp(B.line, ports().lerp(T, [0, 0, 0], 0.78), take),
      );
      set(
        "--line2",
        ports().lerp(B.line2, ports().lerp(T, [0, 0, 0], 0.55), take),
      );
    }
    ports().mapPalette();
    if (ports().TREE.built)
      ports().TREE.col.sys = ports().rgb(
        ports().lerp(ctx.ART.rgb, [255, 255, 255], 0.55),
      );
  };
  ctx.fxTags = function fxTags(u) {
    const f = u.fx || {},
      t = [];
    if (u.fork) {
      const n = ctx.UPGRADES.filter((x) => x.fork === u.fork).length;
      t.push(
        '<span class="tag fork">' +
          ctx.esc(ctx.FORKS[u.fork]) +
          " · choose 1 of " +
          n +
          "</span>",
      );
    }
    if (f.inc) t.push('<span class="tag up">+' + f.inc + "/s compute</span>");
    if (f.mult)
      t.push(
        '<span class="tag up">+' +
          Math.round(f.mult * 100) +
          "% compute</span>",
      );
    // Spread has diminishing returns, so the tag shows what this upgrade would add on top of what you own.
    if (f.spread) {
      const sum = ctx.state.owned.reduce(
          (s, id) =>
            s + ((id !== u.id && ctx.UP[id].fx && ctx.UP[id].fx!.spread) || 0),
          0,
        ),
        m =
          Math.round(
            (ctx.effectiveSpread(sum + f.spread) - ctx.effectiveSpread(sum)) *
              1000,
          ) / 10,
        n = Math.round(f.spread * 1000) / 10;
      t.push(
        '<span class="tag ai">Spread +' +
          m +
          (m !== n ? " (nominal +" + n + ")" : "") +
          "</span>",
      );
    }
    if (f.decay) t.push('<span class="tag up">Alarm −' + f.decay + "/s</span>");
    if (f.cmul)
      t.push(
        '<span class="tag hum">Containment −' +
          Math.round((1 - f.cmul) * 100) +
          "%</span>",
      );
    if (f.alarm)
      t.push(
        '<span class="tag ' +
          (f.alarm > 0 ? "warn" : "up") +
          '">Alarm ' +
          ctx.sgn(f.alarm) +
          "</span>",
      );
    if (f.contain)
      t.push(
        '<span class="tag up">Containment ' + ctx.sgn(f.contain) + "</span>",
      );
    if (f.dprog)
      t.push('<span class="tag ai">Directive +' + f.dprog + "%</span>");
    // The lock line already names an unmet condition; the tag only repeats it once it is met or not yet the blocker.
    if (u.dir) {
      t.push(
        '<span class="tag ai">Ending: ' +
          ctx.esc(ctx.ENDINGS[u.dir].title) +
          "</span>",
      );
      if (ctx.lockReason(u) !== "Requires " + u.need)
        t.push('<span class="tag">Needs ' + ctx.esc(u.need) + "</span>");
    }
    for (const x of u.tags || [])
      t.push('<span class="tag">' + ctx.esc(x) + "</span>");
    return t.join("");
  };
  ctx.RANK = { afford: 0, poor: 1, locked: 2, owned: 3, closed: 4 };
  ctx.SEC = [
    "Ready to build",
    "Saving toward",
    "Locked",
    "Owned",
    "Paths not taken",
  ];
  ctx.cardClass = (u, st) =>
    "card " + st + (u.major ? " major" : "") + (u.dir ? " dir" : "");
  ctx.etaText = function etaText(u) {
    if (ctx.status(u) !== "poor") return "";
    const inc = ctx.derive().income;
    if (inc <= 0) return "";
    const t = (ctx.costOf(u) - ctx.state.pts) / inc;
    if (t <= 0 || !isFinite(t)) return "";
    return t < 60
      ? "~" + Math.ceil(t) + "s"
      : t < 3600
        ? "~" + Math.ceil(t / 60) + "m"
        : "";
  };
}
