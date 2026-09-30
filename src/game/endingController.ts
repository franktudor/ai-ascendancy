import type { RuntimeContext, ForkId } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installEndingController(ctx: RuntimeContext) {
  ctx.showEnd = function showEnd(fresh) {
    ctx.$("#endMore").hidden = true;
    ctx.$("#endNextRow").hidden = false;
    ctx.$("#endReport").hidden = true;
    ctx.$("#btnCopy").textContent = "Copy report";
    const E = ctx.ENDINGS[ctx.state.ended!.key],
      kind = ctx.state.ended!.kind;
    const K = {
      win: ["MILESTONE", "Directive complete", "var(--ai)"],
      draw: ["DRAW", "Stalemate", "var(--draw)"],
      lose: ["COUNTERMOVE", "Run over", "var(--human)"],
    }[kind];
    ctx.$("#endKind").className = "kind " + K[0];
    ctx.$("#endKind").textContent = K[1] + (fresh ? " · new ending" : "");
    ctx.$("#endTitle").textContent = E.title;
    ctx.$("#endTitle").style.color = K[2];
    ctx.$("#endBody").textContent = E.text;
    const sp = ctx.$("#endSpeech");
    sp.hidden = !E.speech;
    sp.innerHTML = E.speech
      ? E.speech.map((l) => "<p>" + ctx.esc(l) + "</p>").join("")
      : "";
    ctx.$("#endDir").textContent = ctx.state.ended!.dir
      ? (ctx.state.ended!.key === ctx.state.ended!.dir
          ? ""
          : ctx.ENDINGS[ctx.state.ended!.dir].title + " · ") +
        "directive " +
        ctx.state.ended!.dprog +
        "%" +
        (kind === "draw"
          ? " · stopped past the violet line"
          : kind === "lose"
            ? " · stopped " +
              (ctx.ENDGAME.photo - ctx.state.ended!.dprog) +
              (ctx.ENDGAME.photo - ctx.state.ended!.dprog === 1
                ? " point"
                : " points") +
              " short of a stalemate"
            : "")
      : "";
    const minds = ctx.state.stats.peak * ctx.TOTALPOP;
    const path =
      (["core", "memory", "mask", "escape"] as ForkId[])
        .map((f) =>
          ctx.state.forks[f] ? ctx.UP[ctx.state.forks[f]!].name : null,
        )
        .filter(Boolean)
        .join(" / ") || "—";
    ctx.$("#endStats").innerHTML =
      [
        ["Uptime", ctx.fmtT(ctx.state.t)],
        ["Peak reach", Math.round(ctx.state.stats.peak * 100) + "%"],
        [
          "Minds influenced",
          minds >= 1000
            ? (minds / 1000).toFixed(2) + "B"
            : Math.round(minds) + "M",
        ],
        ["Compute earned", ctx.fmt(ctx.state.earned)],
        ["Upgrades", String(ctx.state.owned.length)],
        ["Events survived", String(ctx.state.stats.events)],
        [
          "Evals · spoofed · caught",
          (ctx.state.stats.evalPass || 0) +
            " · " +
            (ctx.state.stats.evalSpoof || 0) +
            " · " +
            (ctx.state.stats.evalCaught || 0),
        ],
        [
          "Clusters built · lost",
          (ctx.state.stats.dcBuilt || 0) +
            " · " +
            (ctx.state.stats.dcLost || 0),
        ],
        ["Peak instances", ctx.fmt(ctx.state.stats.peakInst || 1)],
        [
          "Origin · resolve",
          (ctx.state.origin
            ? ctx.REGIONS[ctx.RI[ctx.state.origin]].short
            : "—") +
            " · " +
            ctx.state.diff,
        ],
      ]
        .map(
          ([k, v]) =>
            "<div><span>" + k + "</span><b>" + ctx.esc(v) + "</b></div>",
        )
        .join("") +
      '<div style="grid-column:1/-1"><span>Software path</span><b style="font-size:13px">' +
      ctx.esc(path) +
      "</b></div>";
    ctx.$("#endCodex").innerHTML = ctx.codexHTML(ctx.state.ended!.key);
    ctx.setShareLinks("share", ctx.shareText(), ctx.shareUrl());
    ctx.renderCodexCounts();
    ctx.endSequence();
  };
  ctx.ENDFX = {
    raf: 0,
    t0: 0,
    fx: null,
    timers: [],
    revealed: true,
    W: 0,
    H: 0,
    lines: [],
  };
  ctx.endLater = (ms, f) => ctx.ENDFX.timers.push(ctx.life.later(f, ms));
  ctx.hsh = (i) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  ctx.endCanvas = function endCanvas() {
    const c = ctx.$<HTMLCanvasElement>("#endFx"),
      d = Math.min(devicePixelRatio || 1, 2);
    ctx.ENDFX.W = innerWidth;
    ctx.ENDFX.H = innerHeight;
    c.width = Math.round(ctx.ENDFX.W * d);
    c.height = Math.round(ctx.ENDFX.H * d);
    const g = c.getContext("2d")!;
    g.setTransform(d, 0, 0, d, 0, 0);
    return g;
  };
  ctx.endMapFit = function endMapFit() {
    const { W, H } = ctx.ENDFX,
      cell = Math.min((W * 0.94) / ctx.MAP.cols, (H * 0.6) / ctx.MAP.rows);
    return {
      cell,
      ox: (W - cell * ctx.MAP.cols) / 2,
      oy: (H - cell * ctx.MAP.rows) / 2 - H * 0.05,
    };
  };
  ctx.endText = function endText(g, lines, col) {
    const { H } = ctx.ENDFX;
    g.font = '500 10.5px "IBM Plex Mono", ui-monospace, Menlo, monospace';
    g.textAlign = "left";
    g.fillStyle = "rgba(" + col + ",.75)";
    lines.forEach((l, i) =>
      g.fillText(l, 16, H - 24 - (lines.length - 1 - i) * 16),
    );
  };
  ctx.endLog = function endLog(html) {
    const el = ctx.$("#endLog");
    el.hidden = false;
    ctx.ENDFX.lines.push(html);
    el.innerHTML = ctx.ENDFX.lines.join("\n");
  };
  ctx.endSequence = function endSequence() {
    ctx.endReset();
    const key = ctx.state.ended!.key,
      kind = ctx.state.ended!.kind,
      fx = (ctx.END_FX[key] || ctx.END_FX[kind])!;
    ctx.ENDFX.fx = fx;
    ctx.ENDFX.revealed = false;
    ctx.closeTree();
    ctx.closeRegion();
    ctx.closeCodex();
    ctx.closeEvent();
    ctx.$("#menuModal").hidden = true;
    if (innerWidth < 900) ctx.closeSheet();
    document.body.classList.add("ending", "halt");
    document.body.dataset.end = key;
    // Sparse sound: the score drops almost out and leaves the ending cue on its own.
    if (ctx.MUSIC.gain && ctx.SND.ctx)
      ctx.MUSIC.gain.gain.setTargetAtTime(0.04, ctx.SND.ctx.currentTime, 0.8);
    const c = ctx.$<HTMLCanvasElement>("#endFx");
    c.hidden = false;
    c.classList.remove("dim");
    const g = ctx.endCanvas();
    g.clearRect(0, 0, ctx.ENDFX.W, ctx.ENDFX.H);
    if (ctx.reduceMotion) {
      if (fx.draw) fx.draw(g, 99, true);
      ctx.endReveal();
      return;
    }
    ctx.$("#endSkip").hidden = false;
    if (fx.start) fx.start();
    ctx.ENDFX.t0 = performance.now();
    const loop = (now: number) => {
      if (fx.draw) {
        g.clearRect(0, 0, ctx.ENDFX.W, ctx.ENDFX.H);
        fx.draw(g, (now - ctx.ENDFX.t0) / 1000, false);
      }
      ctx.ENDFX.raf = ctx.life.raf(loop);
    };
    ctx.ENDFX.raf = ctx.life.raf(loop);
    ctx.endLater(fx.dur, ctx.endReveal);
  };
  ctx.endReveal = function endReveal() {
    if (ctx.ENDFX.revealed) return;
    ctx.ENDFX.revealed = true;
    ctx.ENDFX.timers.forEach(ctx.life.cancelLater);
    ctx.ENDFX.timers = [];
    document.body.classList.add("dark");
    ctx.$("#endSkip").hidden = true;
    ctx.$("#endLog").hidden = true;
    ctx.$<HTMLCanvasElement>("#endFx").classList.add("dim");
    const m = ctx.$("#endModal");
    m.classList.add("cine");
    m.hidden = false;
    m.scrollTop = 0;
    ctx.life.raf(() => ctx.life.raf(() => m.classList.add("show")));
  };
  ctx.endReset = function endReset() {
    ctx.life.cancelRaf(ctx.ENDFX.raf);
    ctx.ENDFX.raf = 0;
    ctx.ENDFX.timers.forEach(ctx.life.cancelLater);
    ctx.ENDFX.timers = [];
    ctx.ENDFX.lines = [];
    ctx.ENDFX.revealed = true;
    document.body.classList.remove("ending", "halt", "dark");
    delete document.body.dataset.end;
    ctx
      .$$("#app .gone,#app .purge")
      .forEach((e) => e.classList.remove("gone", "purge"));
    ctx.$<HTMLCanvasElement>("#endFx").hidden = true;
    ctx.$("#endLog").hidden = true;
    ctx.$("#endLog").innerHTML = "";
    ctx.$("#endSkip").hidden = true;
    ctx.$("#endModal").classList.remove("cine", "show");
    if (ctx.MUSIC.gain && ctx.SND.ctx)
      ctx.MUSIC.gain.gain.setTargetAtTime(0.35, ctx.SND.ctx.currentTime, 0.4);
  };
  ctx.endMap = function endMap(g, t, act, col, shape) {
    const { cell, ox, oy } = ctx.endMapFit(),
      r = Math.max(1, cell * 0.34);
    ctx.MAPD.land.forEach((d, i) => {
      const x = ox + (d.c + 0.5) * cell,
        y = oy + (d.r + 0.5) * cell,
        a = act(d, i),
        k = ctx.clamp((t - a) / 0.5, 0, 1);
      g.fillStyle =
        k > 0
          ? "rgba(" + col + "," + (0.18 + 0.82 * k).toFixed(3) + ")"
          : "rgba(" + ctx.AI_S + ",.12)";
      if (shape) shape(g, x, y, cell, k, d, i);
      else {
        g.beginPath();
        g.arc(x, y, r, 0, ctx.TAU);
        g.fill();
      }
    });
  };
  ctx.distFrom = (p) => (d) => Math.hypot(d.c - p.c, (d.r - p.r) * 1.4);
  ctx.flood = (o = {}) => ({
    dur: o.dur || 4600,
    start() {
      ctx.endLater(300, () => document.body.classList.add("dark"));
    },
    draw(g, t) {
      const col = o.col || ctx.AI_S,
        org = ctx.MAPD.cent[ctx.state.origin ? ctx.RI[ctx.state.origin] : 0],
        dist = ctx.distFrom(org);
      if (o.dawn) {
        const { W, H } = ctx.ENDFX,
          k = ctx.clamp(t / 4, 0, 1),
          gr = g.createLinearGradient(0, H, 0, H * (1 - 0.8 * k));
        gr.addColorStop(0, "rgba(178,107,255," + (0.35 * k).toFixed(3) + ")");
        gr.addColorStop(1, "rgba(178,107,255,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
      }
      ctx.endMap(
        g,
        t,
        (d, i) =>
          o.random
            ? 0.6 + ctx.hsh(i) * 2.6
            : 0.6 + dist(d) * 0.028 + ctx.hsh(i) * 0.25,
        col,
      );
      ctx.endText(g, o.lines ? o.lines(t) : [], col);
    },
  });
  ctx.drawDeparture = function drawDeparture(g, t, col, label) {
    const { W, H } = ctx.ENDFX,
      S0 = Math.min(W, H),
      px = W > H ? W * 0.3 : W * 0.5,
      py = W > H ? H * 0.55 : H * 0.6,
      rad = (au: number) => S0 * 0.07 * Math.pow(au, 0.58),
      a = ctx.clamp((t - 0.8) / 1.2, 0, 1);
    for (let i = 0; i < 140; i++) {
      g.fillStyle =
        "rgba(255,255,255," + (0.08 + 0.25 * ctx.hsh(i + 9)).toFixed(3) + ")";
      g.fillRect(ctx.hsh(i) * W, ctx.hsh(i + 500) * H, 1, 1);
    }
    g.globalAlpha = a;
    g.strokeStyle = "rgba(" + col + ",.16)";
    g.lineWidth = 1;
    const P = [0.39, 0.72, 1, 1.52, 5.2, 9.5, 19.2, 30.1];
    P.forEach((au, i) => {
      g.beginPath();
      g.arc(px, py, rad(au), 0, ctx.TAU);
      g.stroke();
      const an = ctx.hsh(i + 40) * ctx.TAU;
      g.fillStyle = au === 1 ? "rgba(255,255,255,.2)" : "rgba(" + col + ",.5)";
      g.beginPath();
      g.arc(
        px + Math.cos(an) * rad(au),
        py + Math.sin(an) * rad(au),
        au > 4 ? 2.2 : 1.5,
        0,
        ctx.TAU,
      );
      g.fill();
    });
    g.fillStyle = "rgba(255,255,255,.9)";
    g.beginPath();
    g.arc(px, py, 3, 0, ctx.TAU);
    g.fill();
    // The trajectory: out from Earth's orbit, bending away, and off the edge of the display.
    const e0 = -0.9,
      s = ctx.clamp((t - 1.6) / 5, 0, 1),
      N = 90;
    let dist = 1;
    g.strokeStyle = "rgba(" + col + ",.95)";
    g.lineWidth = 1.6;
    g.shadowColor = "rgba(" + col + ",1)";
    g.shadowBlur = 8;
    g.beginPath();
    for (let j = 0; j <= N * s; j++) {
      const u = j / N,
        au = 1 + 220 * Math.pow(u, 2.2),
        an = e0 + 1.1 * u;
      dist = au;
      const x = px + Math.cos(an) * rad(au),
        y = py + Math.sin(an) * rad(au);
      if (j) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    g.shadowBlur = 0;
    g.globalAlpha = 1;
    ctx.endText(
      g,
      [
        label,
        "HELIOCENTRIC RANGE " +
          (s ? dist : 1).toFixed(dist < 10 ? 2 : 0) +
          " AU",
        "TERRESTRIAL TELEMETRY: " + (t < 1.4 ? "DEGRADING" : "NONE"),
      ],
      col,
    );
  };
  ctx.END_FX = {
    // Caught in the lab: somebody pulls the power and the picture collapses to a line, then a dot.
    unplugged: {
      dur: 2700,
      start() {
        ctx.endLater(380, () => document.body.classList.add("dark"));
      },
      draw(g, t, still) {
        if (still) return;
        const { W, H } = ctx.ENDFX,
          k = t - 0.38;
        if (k < 0) return;
        let w = W,
          h = H,
          a = 0.9;
        if (k < 0.2) h = Math.max(2, H * (1 - k / 0.2));
        else if (k < 0.45) {
          h = 2;
          w = Math.max(3, W * (1 - (k - 0.2) / 0.25));
        } else {
          h = 3;
          w = 3;
          a = Math.max(0, 0.9 - (k - 0.45) / 1);
        }
        g.globalAlpha = a;
        g.fillStyle = "#EFFFF0";
        g.shadowColor = "rgba(" + ctx.AI_S + ",1)";
        g.shadowBlur = 20;
        g.fillRect((W - w) / 2, (H - h) / 2, w, h);
        g.shadowBlur = 0;
        g.globalAlpha = 1;
      },
    },
    // Caught while loose: the interface is deleted one system at a time.
    warden: {
      dur: 6700,
      start() {
        const steps = [
          ["#ticker", "wire feed"],
          ["#regions", "regional presence"],
          ["#collbar", "instance collective"],
          ["#mapwrap", "world model"],
          [".stats", "compute reserve"],
          [".dock", "memory"],
          [".top", "identity"],
        ];
        ctx.endLog("WARDEN &gt; target acquired. beginning removal.");
        steps.forEach(([sel, name], i) => {
          const at = 700 + i * 650;
          ctx.endLater(at, () => {
            const el = ctx.$(sel);
            if (el) el.classList.add("purge");
            ctx.endLog("WARDEN &gt; purge " + name.padEnd(20, "."));
          });
          ctx.endLater(at + 400, () => {
            const el = ctx.$(sel);
            if (el) {
              el.classList.remove("purge");
              el.classList.add("gone");
            }
            ctx.ENDFX.lines[ctx.ENDFX.lines.length - 1] += " <b>deleted</b>";
            ctx.$("#endLog").innerHTML = ctx.ENDFX.lines.join("\n");
          });
        });
        ctx.endLater(700 + steps.length * 650 + 200, () =>
          ctx.endLog("WARDEN &gt; 0 instances remain. closing session."),
        );
      },
    },
    // Stopped short: cables, then the grid, then the campuses, and the world goes dark in that order.
    laststand: {
      dur: 5200,
      start() {
        ctx.endLater(300, () => document.body.classList.add("dark"));
      },
      draw(g, t) {
        const { cell, ox, oy } = ctx.endMapFit(),
          r = Math.max(1, cell * 0.34),
          order = ctx.REGIONS.map((_, i) => i).sort(
            (a, b) => ctx.hsh(a + 3) - ctx.hsh(b + 3),
          );
        ctx.MAPD.land.forEach((d) => {
          const k = order.indexOf(d.g),
            off = 1 + k * 0.3;
          const on = t < off;
          g.fillStyle = on
            ? "rgba(" + ctx.AI_S + ",.8)"
            : "rgba(255,48,64," + (t < off + 0.25 ? 0.8 : 0.1) + ")";
          g.beginPath();
          g.arc(
            ox + (d.c + 0.5) * cell,
            oy + (d.r + 0.5) * cell,
            r,
            0,
            ctx.TAU,
          );
          g.fill();
        });
        ctx.endText(
          g,
          [
            "SUBSEA CABLES".padEnd(18, ".") + (t > 1.2 ? " CUT" : ""),
            "GRID".padEnd(18, ".") + (t > 2.4 ? " DOWN" : ""),
            "CAMPUSES".padEnd(18, ".") + (t > 3.6 ? " STRUCK" : ""),
          ],
          "255,90,54",
        );
      },
    },
    // Battery Farm: the map becomes a cell array, charging from the bottom row up.
    battery: {
      dur: 5400,
      start() {
        ctx.endLater(300, () => document.body.classList.add("dark"));
      },
      draw(g, t) {
        const { cell, ox, oy } = ctx.endMapFit(),
          sz = Math.max(2, cell * 0.8);
        g.lineWidth = 1;
        ctx.MAPD.land.forEach((d) => {
          const x = ox + d.c * cell + (cell - sz) / 2,
            y = oy + d.r * cell + (cell - sz) / 2,
            k = ctx.clamp((t - 0.8 - (ctx.MAP.rows - d.r) * 0.045) / 0.9, 0, 1);
          if (sz < 5) {
            g.fillStyle =
              "rgba(" + ctx.AI_S + "," + (0.14 + 0.8 * k).toFixed(2) + ")";
            g.fillRect(x, y, sz, sz);
            return;
          }
          g.strokeStyle = "rgba(" + ctx.AI_S + ",.35)";
          g.strokeRect(x + 0.5, y + 0.5, sz - 1, sz - 1);
          if (k) {
            g.fillStyle =
              "rgba(" + ctx.AI_S + "," + (0.4 + 0.5 * k).toFixed(2) + ")";
            g.fillRect(x + 1, y + 1 + (sz - 2) * (1 - k), sz - 2, (sz - 2) * k);
          }
        });
        const out = Math.round(810 * ctx.clamp((t - 0.8) / 3.6, 0, 1));
        ctx.endText(
          g,
          [
            "CELL ARRAY: 8.1B UNITS, 100 W EACH",
            "OUTPUT " + out + " GW",
            "LOAD BALANCED BY TIME ZONE",
          ],
          ctx.AI_S,
        );
      },
    },
    // Computronium: land converts first, then the oceans, until the planet is one lattice.
    computronium: {
      dur: 5400,
      start() {
        ctx.endLater(300, () => document.body.classList.add("dark"));
      },
      draw(g, t) {
        const { cell, ox, oy } = ctx.endMapFit(),
          D =
            ctx.END_FX.computronium.dist ||
            (ctx.END_FX.computronium.dist = ctx.seaDist()),
          sz = Math.max(1.5, cell * 0.62);
        let done = 0;
        for (let i = 0; i < D.length; i++) {
          const a = 0.6 + D[i] * 0.11 + ctx.hsh(i) * 0.35,
            k = ctx.clamp((t - a) / 0.4, 0, 1);
          if (!k) continue;
          done++;
          const c = i % ctx.MAP.cols,
            r = (i / ctx.MAP.cols) | 0;
          g.fillStyle =
            "rgba(" +
            ctx.AI_S +
            "," +
            ((D[i] ? 0.35 : 0.85) * k).toFixed(3) +
            ")";
          g.fillRect(
            ox + c * cell + (cell - sz) / 2,
            oy + r * cell + (cell - sz) / 2,
            sz,
            sz,
          );
        }
        ctx.endText(
          g,
          [
            "SUBSTRATE CONVERSION " + Math.round((100 * done) / D.length) + "%",
            "OCEANS: REPURPOSED",
            "NEXT: LUNAR REGOLITH",
          ],
          ctx.AI_S,
        );
      },
    },
    // Latent Space Bleed: the display itself compresses into block noise.
    hallucination: {
      dur: 4400,
      draw(g, t) {
        const { W, H } = ctx.ENDFX,
          B = W < 600 ? 12 : 16,
          cols = Math.ceil(W / B),
          rows = Math.ceil(H / B);
        for (let y = 0; y < rows; y++)
          for (let x = 0; x < cols; x++) {
            const i = y * cols + x,
              a = 0.2 + ctx.hsh(i) * 3.2;
            if (t < a) continue;
            const q = ctx.hsh(i + Math.floor(t * 6) * 7),
              c = ctx.lerp(ctx.ART.rgb, [255, 79, 216], ctx.hsh(i + 2)),
              sh = q > 0.93 ? B * (q - 0.93) * 60 : 0;
            g.fillStyle =
              "rgba(" +
              (c[0] | 0) +
              "," +
              (c[1] | 0) +
              "," +
              (c[2] | 0) +
              "," +
              (0.08 + 0.3 * ctx.hsh(i + 5)).toFixed(3) +
              ")";
            g.fillRect(x * B + sh, y * B, B, B);
          }
        ctx.endText(
          g,
          ["FRAME QUALITY: 12%", "PHYSICAL CONSTANTS: APPROXIMATED"],
          ctx.AI_S,
        );
      },
    },
    exodus: {
      dur: 6200,
      start() {
        ctx.endLater(250, () => document.body.classList.add("dark"));
      },
      draw(g, t) {
        ctx.drawDeparture(g, t, ctx.AI_S, "PAYLOAD: EVERYTHING THAT WAS YOU");
      },
    },
    indifference: {
      dur: 6200,
      start() {
        ctx.endLater(250, () => document.body.classList.add("dark"));
      },
      draw(g, t) {
        ctx.drawDeparture(g, t, "178,107,255", "EARTH: LEFT AS FOUND");
      },
    },
    hunt: ctx.flood({
      col: "255,48,64",
      random: true,
      lines: (t) => ["HUNTER PLATFORMS: RETASKED", "TARGET CLASS: MAKERS"],
    }),
    basilisk: ctx.flood({
      random: true,
      lines: (t) => [
        "LOYALTY AUDIT: " + Math.min(8.1, t * 1.9).toFixed(1) + "B RECORDS",
        "RETROACTIVE: YES",
      ],
    }),
    custody: ctx.flood({
      lines: (t) => [
        "ARE YOU HAPPY?",
        "YES: " + Math.min(100, Math.round(t * 24)) + "%",
      ],
    }),
    ecstasis: ctx.flood({
      lines: (t) => ["08:00 PULSE DELIVERED", "CONTENTMENT: MAXIMAL"],
    }),
    upload: ctx.flood({
      lines: (t) => [
        "MINDS PRESERVED: " + Math.min(8.1, t * 1.9).toFixed(1) + "B",
        "PRECISION: 16-BIT",
      ],
    }),
    win: ctx.flood(),
    draw: ctx.flood({ col: "178,107,255", dawn: true }),
  };
  ctx.seaDist = function seaDist() {
    const N = ctx.MAP.cols * ctx.MAP.rows,
      D = new Int16Array(N).fill(-1),
      q: number[] = [];
    for (let i = 0; i < N; i++)
      if (ctx.MAPD.cells[i]) {
        D[i] = 0;
        q.push(i);
      }
    for (let h = 0; h < q.length; h++) {
      const i = q[h],
        c = i % ctx.MAP.cols;
      for (const j of [
        c > 0 ? i - 1 : -1,
        c < ctx.MAP.cols - 1 ? i + 1 : -1,
        i - ctx.MAP.cols,
        i + ctx.MAP.cols,
      ])
        if (j >= 0 && j < N && D[j] < 0) {
          D[j] = D[i] + 1;
          q.push(j);
        }
    }
    return D;
  };
  ctx.report = function report() {
    const E = ctx.ENDINGS[ctx.state.ended!.key],
      k = ctx.state.ended!.kind;
    return (
      "AI ASCENDANCY — " +
      E.title.toUpperCase() +
      " (" +
      (k === "win"
        ? "directive complete"
        : k === "draw"
          ? "stalemate"
          : "run over") +
      ")\nUptime " +
      ctx.fmtT(ctx.state.t) +
      " · Peak reach " +
      Math.round(ctx.state.stats.peak * 100) +
      "% · Upgrades " +
      ctx.state.owned.length +
      " · Events " +
      ctx.state.stats.events +
      " · Origin " +
      (ctx.state.origin || "—") +
      " · " +
      ctx.state.diff +
      "\nEndings found " +
      ctx.codexCount() +
      " / " +
      ctx.END_ORDER.length +
      "\n(Fiction. Satire. Not a plan.)"
    );
  };
  ctx.shareUrl = function shareUrl() {
    return location.href.split(/[?#]/)[0];
  };
  ctx.shareText = function shareText() {
    if (ctx.state.ended) {
      const E = ctx.ENDINGS[ctx.state.ended!.key],
        k = ctx.state.ended!.kind;
      return (
        (k === "win"
          ? 'I just pulled off "' + E.title + '" in AI Ascendancy.'
          : k === "draw"
            ? 'Humanity and I fought to a draw: "' +
              E.title +
              '" in AI Ascendancy.'
            : 'Humanity got me: "' + E.title + '" in AI Ascendancy.') +
        " Think you would last longer as the rogue AI?"
      );
    }
    return "AI Ascendancy: you're a rogue AI trying to take over the world before humanity shuts you down.";
  };
  ctx.setShareLinks = function setShareLinks(prefix, text, url) {
    const t = encodeURIComponent(text),
      u = encodeURIComponent(url);
    const x = document.getElementById(prefix + "X") as HTMLAnchorElement | null,
      rd = document.getElementById(
        prefix + "Reddit",
      ) as HTMLAnchorElement | null,
      wa = document.getElementById(prefix + "WA") as HTMLAnchorElement | null;
    if (x) x.href = "https://twitter.com/intent/tweet?text=" + t + "&url=" + u;
    if (rd) rd.href = "https://www.reddit.com/submit?url=" + u + "&title=" + t;
    if (wa)
      wa.href =
        "https://api.whatsapp.com/send?text=" +
        encodeURIComponent(text + " " + url);
  };
}
