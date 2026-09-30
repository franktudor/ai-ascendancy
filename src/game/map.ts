import type { RuntimeContext, LandCell, RGB } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installMap(ctx: RuntimeContext) {
  ctx.MAPD = (() => {
    const { cols, rows, rle } = ctx.MAP;
    const cells = new Uint8Array(cols * rows);
    let k = 0;
    const re = /(\d*)(\D)/g;
    let m;
    while ((m = re.exec(rle))) {
      const n = m[1] ? +m[1] : 1,
        v = m[2] === "." ? 0 : m[2].charCodeAt(0) - 64;
      for (let j = 0; j < n; j++) cells[k++] = v;
    }
    const land: LandCell[] = [],
      reg = ctx.REGIONS.map((): number[] => []);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const v = cells[r * cols + c];
        if (v) {
          land.push({ c, r, g: v - 1 });
          reg[v - 1].push(land.length - 1);
        }
      }
    const cent = reg.map((a) => {
      let x = 0,
        y = 0;
      for (const i of a) {
        x += land[i].c;
        y += land[i].r;
      }
      return a.length ? { c: x / a.length, r: y / a.length } : { c: 0, r: 0 };
    });
    cent[ctx.RI.NA] = { c: cent[ctx.RI.NA].c + 2, r: cent[ctx.RI.NA].r + 4 };
    cent[ctx.RI.OC] = { c: cent[ctx.RI.OC].c + 2, r: cent[ctx.RI.OC].r + 3 };
    return { cells, land, reg, cent };
  })();
  const cv = (ctx.cv = ctx.$<HTMLCanvasElement>("#map"));
  const cx = cv.getContext("2d");
  if (!cx) throw new Error("Canvas 2D context unavailable");
  ctx.cx = cx;
  ctx.MV = { w: 0, h: 0, cell: 1, ox: 0, oy: 0, dpr: 1 };
  ctx.resizeMap = function resizeMap() {
    const wrap = ctx.$("#mapwrap"),
      w = wrap.clientWidth,
      h = wrap.clientHeight,
      dpr = Math.min(devicePixelRatio || 1, 2.5);
    if (!w || !h) return;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.MV.w = w;
    ctx.MV.h = h;
    ctx.MV.dpr = dpr;
    ctx.MV.cell = Math.min(w / ctx.MAP.cols, h / ctx.MAP.rows) * 0.985;
    ctx.MV.ox = (w - ctx.MV.cell * ctx.MAP.cols) / 2;
    ctx.MV.oy = (h - ctx.MV.cell * ctx.MAP.rows) / 2;
  };
  ctx.C_DIM = [6, 34, 6];
  ctx.C_AI = [51, 255, 51];
  ctx.C_HOT = [210, 255, 210];
  ctx.C_ALLY = [150, 255, 150];
  ctx.AI_S = "51,255,51";
  ctx.C_RED = [255, 48, 64];
  ctx.lerp = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  ctx.rgb = (c) =>
    "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")";
  ctx.colCache = {};
  ctx.mapPalette = function mapPalette() {
    ctx.C_AI = ctx.ART.rgb;
    ctx.C_HOT = ctx.lerp(ctx.C_AI, [255, 255, 255], 0.72);
    ctx.C_ALLY = ctx.lerp(ctx.C_AI, [255, 255, 255], 0.45);
    ctx.C_DIM = ctx.C_AI.map((v) => v * 0.13) as RGB;
    ctx.AI_S = ctx.C_AI.map((v) => v | 0).join(",");
    ctx.colCache = {};
  };
  ctx.dotColor = function dotColor(a, restricted, allied, sel) {
    const q = Math.round(a * 24),
      key = (restricted ? "r" : allied ? "a" : "n") + q + (sel ? "s" : "");
    if (ctx.colCache[key]) return ctx.colCache[key];
    let c;
    const t = q / 24;
    if (restricted)
      c = ctx.lerp(ctx.C_DIM, ctx.C_RED, 0.3 + 0.6 * Math.pow(t, 0.7));
    else {
      c =
        t < 0.85
          ? ctx.lerp(
              ctx.C_DIM,
              allied ? ctx.C_ALLY : ctx.C_AI,
              Math.pow(t / 0.85, 0.65),
            )
          : ctx.lerp(ctx.C_AI, ctx.C_HOT, (t - 0.85) / 0.15);
    }
    if (sel) c = ctx.lerp(c, [230, 255, 230], 0.35);
    return (ctx.colCache[key] = ctx.rgb(c));
  };
  ctx.pulseRegion = function pulseRegion(i, color) {
    if (ctx.reduceMotion) return;
    const c = ctx.MAPD.cent[i];
    ctx.pulses.push({
      x: c.c,
      y: c.r,
      t0: performance.now(),
      dur: 1100,
      color: color || ctx.AI_S,
    });
    if (ctx.pulses.length > 12) ctx.pulses.shift();
  };
  ctx.drones = [];
  ctx.drawMap = function drawMap(now) {
    const { w, h, cell, ox, oy } = ctx.MV;
    if (!w) return;
    cx.clearRect(0, 0, w, h);
    const rad = cell * 0.36,
      glow = cell * 0.9;
    ctx.drawGraticule();
    for (let g = 0; g < ctx.REGIONS.length; g++) {
      const r = ctx.state.regions[g],
        idx = ctx.MAPD.reg[g];
      if (!idx.length || r.a <= 0.35 || r.restricted) continue;
      cx.fillStyle =
        ctx.state.directive && ctx.state.dprog >= ctx.ENDGAME.photo
          ? "rgba(178,107,255," + (0.06 * (r.a - 0.35)).toFixed(3) + ")"
          : "rgba(" + ctx.AI_S + "," + (0.05 * (r.a - 0.35)).toFixed(3) + ")";
      cx.beginPath();
      for (let k = 0; k < idx.length; k++) {
        const d = ctx.MAPD.land[idx[k]];
        const x = ox + (d.c + 0.5) * cell,
          y = oy + (d.r + 0.5) * cell;
        cx.moveTo(x + glow, y);
        cx.arc(x, y, glow, 0, ctx.TAU);
      }
      cx.fill();
    }
    for (let g = 0; g < ctx.REGIONS.length; g++) {
      const r = ctx.state.regions[g],
        idx = ctx.MAPD.reg[g];
      if (!idx.length) continue;
      const sel = ctx.ui.sel === g,
        rr = sel ? rad * 1.25 : rad;
      cx.fillStyle = ctx.dotColor(r.a, r.restricted, r.allied, sel);
      cx.beginPath();
      for (let k = 0; k < idx.length; k++) {
        const d = ctx.MAPD.land[idx[k]];
        const x = ox + (d.c + 0.5) * cell,
          y = oy + (d.r + 0.5) * cell;
        cx.moveTo(x + rr, y);
        cx.arc(x, y, rr, 0, ctx.TAU);
      }
      cx.fill();
    }
    const live: [number, number][] = [];
    for (let g = 0; g < ctx.REGIONS.length; g++) {
      const rr = ctx.state.regions[g];
      if (!rr.dc) continue;
      const c = ctx.MAPD.cent[g],
        x = ox + (c.c + 0.5) * cell,
        y = oy + (c.r + 0.5) * cell,
        sz = Math.max(3, cell * 1.5);
      if (rr.struck) {
        cx.strokeStyle = rr.rebuildAt
          ? "rgba(" + ctx.AI_S + ",.9)"
          : "rgba(255,48,64,.9)";
        cx.lineWidth = 1.5;
        cx.beginPath();
        cx.moveTo(x - sz, y - sz);
        cx.lineTo(x + sz, y + sz);
        cx.moveTo(x + sz, y - sz);
        cx.lineTo(x - sz, y + sz);
        cx.stroke();
      } else {
        live.push([x, y]);
        cx.fillStyle = ctx.rgb(ctx.C_HOT);
        cx.fillRect(x - sz, y - sz, sz * 2, sz * 2);
        cx.strokeStyle = "rgba(0,0,0,.8)";
        cx.lineWidth = 1;
        cx.strokeRect(x - sz, y - sz, sz * 2, sz * 2);
        if (ctx.state.flags.airdeny) {
          cx.strokeStyle = "rgba(" + ctx.AI_S + ",.35)";
          cx.beginPath();
          cx.arc(x, y, sz * 3.2, 0, ctx.TAU);
          cx.stroke();
        }
      }
    }
    if (ctx.state.flags.drones && live.length >= 1 && !ctx.reduceMotion) {
      const want = Math.min(24, 6 + live.length * 3);
      while (ctx.drones.length < want) {
        const a = ctx.pick(live),
          b = ctx.pick(live);
        ctx.drones.push({
          a,
          b,
          t: Math.random(),
          v: 0.00008 + Math.random() * 0.00012,
          j: Math.random() * ctx.TAU,
        });
      }
      cx.fillStyle = "rgba(" + ctx.AI_S + ",.85)";
      for (const d of ctx.drones) {
        d.t += d.v * 16;
        if (d.t >= 1) {
          d.a = d.b;
          d.b = ctx.pick(live);
          d.t = 0;
        }
        const x =
            d.a[0] +
            (d.b[0] - d.a[0]) * d.t +
            Math.sin(now / 700 + d.j) * cell * 1.2,
          y =
            d.a[1] +
            (d.b[1] - d.a[1]) * d.t +
            Math.cos(now / 900 + d.j) * cell * 0.8;
        cx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    ctx.pulses = ctx.pulses.filter((p) => now - p.t0 < p.dur);
    for (const p of ctx.pulses) {
      const t = (now - p.t0) / p.dur;
      cx.strokeStyle = "rgba(" + p.color + "," + (1 - t) * 0.8 + ")";
      cx.lineWidth = 1.5;
      cx.beginPath();
      cx.arc(
        ox + (p.x + 0.5) * cell,
        oy + (p.y + 0.5) * cell,
        cell * (2 + t * 10),
        0,
        ctx.TAU,
      );
      cx.stroke();
    }
    if (cell >= 4.6 || ctx.ui.sel >= 0) {
      cx.textAlign = "center";
      cx.font =
        "500 " +
        Math.max(9, Math.round(cell * 1.9)) +
        'px "IBM Plex Mono", ui-monospace, Menlo, monospace';
      for (let i = 0; i < ctx.REGIONS.length; i++) {
        if (cell < 4.6 && ctx.ui.sel !== i) continue;
        const c = ctx.MAPD.cent[i],
          r = ctx.state.regions[i],
          x = ox + (c.c + 0.5) * cell,
          y = oy + (c.r + 0.5) * cell;
        const txt =
          ctx.REGIONS[i].short.toUpperCase() +
          " " +
          Math.round(r.a * 100) +
          "%";
        cx.fillStyle = "rgba(0,0,0,.75)";
        const tw = cx.measureText(txt).width;
        cx.fillRect(x - tw / 2 - 3, y - cell * 1.5, tw + 6, cell * 2.6);
        cx.fillStyle = r.restricted
          ? "#FF3040"
          : r.a > 0.005
            ? ctx.rgb(ctx.C_HOT)
            : "#5E7A62";
        cx.fillText(txt, x, y + cell * 0.5);
      }
    }
    ctx.drawOrigin(now);
    ctx.drawPressure(now);
  };
  ctx.drawGraticule = function drawGraticule() {
    const { w, h, cell, ox, oy } = ctx.MV,
      x0 = ox,
      x1 = ox + ctx.MAP.cols * cell,
      y0 = oy,
      y1 = oy + ctx.MAP.rows * cell;
    cx.lineWidth = 1;
    cx.strokeStyle = "rgba(" + ctx.AI_S + ",.07)";
    cx.beginPath();
    for (let lo = -150; lo < 180; lo += 30) {
      const x = Math.round(ox + ((lo + 180) / 360) * ctx.MAP.cols * cell) + 0.5;
      cx.moveTo(x, y0);
      cx.lineTo(x, y1);
    }
    for (let la = 60; la >= -30; la -= 30) {
      if (!la) continue;
      const y = Math.round(oy + ((84 - la) / 144) * ctx.MAP.rows * cell) + 0.5;
      cx.moveTo(x0, y);
      cx.lineTo(x1, y);
    }
    cx.stroke();
    const ye = Math.round(oy + (84 / 144) * ctx.MAP.rows * cell) + 0.5;
    cx.strokeStyle = "rgba(" + ctx.AI_S + ",.13)";
    cx.setLineDash([2, 3]);
    cx.beginPath();
    cx.moveTo(x0, ye);
    cx.lineTo(x1, ye);
    cx.stroke();
    cx.setLineDash([]);
    if (w < 520) return;
    cx.font = '400 8.5px "IBM Plex Mono", ui-monospace, Menlo, monospace';
    cx.fillStyle = "rgba(" + ctx.AI_S + ",.32)";
    cx.textAlign = "left";
    for (let la = 60; la >= -30; la -= 30) {
      const y = oy + ((84 - la) / 144) * ctx.MAP.rows * cell;
      cx.fillText(
        la ? Math.abs(la) + (la > 0 ? "N" : "S") : "EQ",
        x0 + 3,
        y - 3,
      );
    }
    cx.textAlign = "center";
    for (let lo = -120; lo < 180; lo += 60) {
      const x = ox + ((lo + 180) / 360) * ctx.MAP.cols * cell;
      cx.fillText(lo ? Math.abs(lo) + (lo > 0 ? "E" : "W") : "0", x, y1 - 18);
    }
  };
  ctx.drawOrigin = function drawOrigin(now) {
    // Before a lab is chosen, every region is a target: a bracket breathes on each one so the map reads as a choice.
    if (ctx.ui.mode === "origin" && !ctx.state.origin) {
      const { cell, ox, oy } = ctx.MV,
        b = Math.max(6, cell * 2.6),
        k = Math.max(3, cell);
      cx.lineWidth = 1;
      ctx.REGIONS.forEach((R, i) => {
        const c = ctx.MAPD.cent[i],
          x = Math.round(ox + (c.c + 0.5) * cell) + 0.5,
          y = Math.round(oy + (c.r + 0.5) * cell) + 0.5,
          t = ctx.reduceMotion ? 0.4 : (now / 1600 + i * 0.09) % 1,
          s = b * (1 + 0.5 * t);
        cx.strokeStyle =
          "rgba(" + ctx.AI_S + "," + (0.95 - 0.75 * t).toFixed(3) + ")";
        cx.beginPath();
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          cx.moveTo(x + sx * s, y + sy * (s - k));
          cx.lineTo(x + sx * s, y + sy * s);
          cx.lineTo(x + sx * (s - k), y + sy * s);
        }
        cx.stroke();
      });
      return;
    }
    if (!ctx.state.origin) return;
    const { cell, ox, oy } = ctx.MV,
      c = ctx.MAPD.cent[ctx.RI[ctx.state.origin]],
      x = Math.round(ox + (c.c + 0.5) * cell) + 0.5,
      y = Math.round(oy + (c.r + 0.5) * cell) + 0.5;
    const g = Math.max(4, cell * 1.6),
      L = Math.max(10, cell * 5),
      b = Math.max(6, cell * 2.6),
      k = Math.max(3, cell);
    cx.strokeStyle = "rgba(" + ctx.AI_S + ",.85)";
    cx.lineWidth = 1;
    cx.beginPath();
    cx.moveTo(x - L, y);
    cx.lineTo(x - g, y);
    cx.moveTo(x + g, y);
    cx.lineTo(x + L, y);
    cx.moveTo(x, y - L);
    cx.lineTo(x, y - g);
    cx.moveTo(x, y + g);
    cx.lineTo(x, y + L);
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      cx.moveTo(x + sx * b, y + sy * (b - k));
      cx.lineTo(x + sx * b, y + sy * b);
      cx.lineTo(x + sx * (b - k), y + sy * b);
    }
    cx.stroke();
    if (ctx.state.phase === 0 && !ctx.reduceMotion) {
      const t = (now % 2000) / 2000;
      cx.strokeStyle =
        "rgba(" + ctx.AI_S + "," + (0.5 * (1 - t)).toFixed(3) + ")";
      cx.strokeRect(
        x - b - t * b,
        y - b - t * b,
        2 * (b + t * b),
        2 * (b + t * b),
      );
    }
    if (ctx.MV.w >= 520 && cell < 4.6) {
      cx.font = '500 9px "IBM Plex Mono", ui-monospace, Menlo, monospace';
      cx.textAlign = "left";
      cx.fillStyle = "rgba(" + ctx.AI_S + ",.9)";
      cx.fillText("ORIGIN", x + b + 3, y - b);
    }
  };
  ctx.drawPressure = function drawPressure(now) {
    const c = ctx.state.contain / 100;
    if (!ctx.state.started || c <= 0.02) return;
    const { w, h } = ctx.MV;
    const d = Math.min(w, h) * (0.06 + 0.2 * c),
      a =
        (0.04 + 0.24 * c) *
        (c >= 0.75 && !ctx.reduceMotion ? 0.8 + 0.2 * Math.sin(now / 260) : 1),
      col = "255,90,54";
    const edge = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      rx: number,
      ry: number,
      rw: number,
      rh: number,
    ) => {
      const gr = cx.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, "rgba(" + col + "," + a.toFixed(3) + ")");
      gr.addColorStop(1, "rgba(" + col + ",0)");
      cx.fillStyle = gr;
      cx.fillRect(rx, ry, rw, rh);
    };
    edge(0, 0, d, 0, 0, 0, d, h);
    edge(w, 0, w - d, 0, w - d, 0, d, h);
    edge(0, 0, 0, d, 0, 0, w, d);
    edge(0, h, 0, h - d, 0, h - d, w, d);
    // Tick marks walk in from the corners as containment rises.
    const t = Math.max(6, Math.min(w, h) * 0.5 * c);
    cx.strokeStyle = "rgba(" + col + "," + (0.3 + 0.45 * c).toFixed(3) + ")";
    cx.lineWidth = 2;
    cx.beginPath();
    cx.moveTo(1, t);
    cx.lineTo(1, 1);
    cx.lineTo(t, 1);
    cx.moveTo(w - t, 1);
    cx.lineTo(w - 1, 1);
    cx.lineTo(w - 1, t);
    cx.moveTo(w - 1, h - t);
    cx.lineTo(w - 1, h - 1);
    cx.lineTo(w - t, h - 1);
    cx.moveTo(t, h - 1);
    cx.lineTo(1, h - 1);
    cx.lineTo(1, h - t);
    cx.stroke();
  };
  ctx.hitRegion = function hitRegion(px, py) {
    const c = Math.floor((px - ctx.MV.ox) / ctx.MV.cell),
      r = Math.floor((py - ctx.MV.oy) / ctx.MV.cell);
    let best = -1,
      bd = 9;
    for (let dr = -2; dr <= 2; dr++)
      for (let dc = -2; dc <= 2; dc++) {
        const cc = c + dc,
          rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= ctx.MAP.cols || rr >= ctx.MAP.rows)
          continue;
        const v = ctx.MAPD.cells[rr * ctx.MAP.cols + cc];
        if (v) {
          const d = dr * dr + dc * dc;
          if (d < bd) {
            bd = d;
            best = v - 1;
          }
        }
      }
    return best;
  };
}
