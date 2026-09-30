import type {
  RuntimeContext,
  UpgradeId,
  UpgradeDefinition,
  TrackId,
  TreeNode,
} from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installTree(ctx: RuntimeContext) {
  ctx.TREE_ORDER = ["opinion", "adoption", "software", "hardware"];
  ctx.TREE = {
    open: false,
    built: false,
    nodes: [],
    edges: [],
    col: {},
    lit: {},
    a: 0,
    va: 0,
    target: null,
    t: 0,
    last: 0,
    hold: 0,
    hover: false,
    drag: null,
    moved: false,
    card: null,
    stT: 0,
    front: -1,
    W: 0,
    H: 0,
    R: 1,
    Y: 1,
    cardTm: 0,
  };
  ctx.TESS = (() => {
    const v: [number, number, number, number][] = [],
      e: [number, number][] = [];
    for (let i = 0; i < 16; i++)
      v.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
    for (let i = 0; i < 16; i++)
      for (let k = 0; k < 4; k++) {
        const j = i ^ (1 << k);
        if (j > i) e.push([i, j]);
      }
    return { v, e };
  })();
  ctx.treeInitials = function treeInitials(name) {
    const w = name
      .replace(/^Directive: /, "")
      .split(/[\s-]+/)
      .filter((x) => x && !/^(the|a|an|of|and|in|for|is|as|to)$/i.test(x));
    return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
  };
  ctx.buildTree = function buildTree() {
    const stage = ctx.$("#trStage"),
      phi: Partial<Record<UpgradeId, number>> = {};
    // Each tier is ordered by where its parents sit, so most links run down rather than across.
    ctx.TREE_ORDER.forEach((tr, k) => {
      const base = (k * Math.PI) / 2,
        tiers = [
          ...new Set(
            ctx.UPGRADES.filter((u) => u.track === tr).map((u) => u.tier),
          ),
        ].sort((a, b) => a - b);
      for (const tier of tiers) {
        const g = ctx.UPGRADES.filter((u) => u.track === tr && u.tier === tier),
          n = g.length,
          step = Math.min(0.27, ((Math.PI / 2) * 0.88) / n);
        const key = (u: UpgradeDefinition, i: number) => {
          const ps = (u.req || [])
            .concat(u.reqAny || [])
            .filter((p) => ctx.UP[p].track === tr && phi[p] != null);
          return ps.length
            ? ps.reduce((s, p) => s + phi[p]!, 0) / ps.length
            : base + (i - (n - 1) / 2) * step;
        };
        g.map((u, i): [UpgradeDefinition, number] => [u, key(u, i)])
          .sort((a, b) => a[1] - b[1])
          .forEach(([u], i) => {
            phi[u.id] = base + (i - (n - 1) / 2) * step;
          });
      }
    });
    ctx.TREE.nodes = ctx.UPGRADES.map((u) => {
      const el = document.createElement("button");
      el.className = "tn";
      el.dataset.id = u.id;
      el.style.setProperty("--tc", ctx.TRACKS[u.track].color);
      el.setAttribute("aria-label", u.name);
      el.innerHTML =
        "<i>" +
        ctx.esc(ctx.treeInitials(u.name)) +
        '</i><em></em><span class="tl">' +
        ctx.esc(u.name.replace(/^Directive: /, "")) +
        "</span>";
      stage.insertBefore(el, ctx.$("#tscrim"));
      // The fourth coordinate varies smoothly around the cylinder, so rows stay straight while neighboring tracks breathe in opposite phase.
      return {
        u,
        el,
        phi: phi[u.id]!,
        w: Math.cos(2 * phi[u.id]!),
        x: 0,
        y: 0,
        f: 0,
        st: "",
        fr: false,
        hit: true,
      };
    });
    const NI = Object.fromEntries(ctx.TREE.nodes.map((n, i) => [n.u.id, i]));
    for (const n of ctx.TREE.nodes) {
      for (const p of n.u.req || [])
        ctx.TREE.edges.push([NI[p], NI[n.u.id], false]);
      for (const p of n.u.reqAny || [])
        ctx.TREE.edges.push([NI[p], NI[n.u.id], true]);
    }
    const cs = getComputedStyle(document.documentElement);
    for (const k of Object.keys(ctx.TRACKS) as TrackId[])
      ctx.TREE.col[k] = cs.getPropertyValue("--" + k).trim();
    ctx.TREE.col.sys = ctx.rgb(ctx.lerp(ctx.ART.rgb, [255, 255, 255], 0.55));
    ctx.$<HTMLSelectElement>("#trGoalSel").innerHTML =
      '<option value="">Aim for an ending…</option>' +
      ctx.UPGRADES.filter((u) => u.dir)
        .map(
          (u) =>
            '<option value="' +
            u.id +
            '">' +
            ctx.esc(ctx.ENDINGS[u.dir!].title) +
            "</option>",
        )
        .join("");
    ctx.$("#trTracks").innerHTML = ctx.TREE_ORDER.map(
      (k, i) =>
        '<button data-k="' +
        i +
        '" style="--tc:' +
        ctx.TRACKS[k].color +
        '">' +
        ctx.TRACKS[k].name +
        "</button>",
    ).join("");
    ctx.TREE.built = true;
  };
  ctx.sizeTree = function sizeTree() {
    const cv = ctx.$<HTMLCanvasElement>("#trCanvas"),
      r = ctx.$("#trStage").getBoundingClientRect(),
      d = Math.min(devicePixelRatio || 1, 2);
    ctx.TREE.W = r.width;
    ctx.TREE.H = r.height;
    cv.width = Math.round(r.width * d);
    cv.height = Math.round(r.height * d);
    cv.getContext("2d")!.setTransform(d, 0, 0, d, 0, 0);
    // Narrow screens get a wider cylinder: the facing track spreads across the screen and its neighbors fall off the sides.
    ctx.TREE.R = r.width < 700 ? r.width * 0.6 : Math.min(r.width * 0.42, 560);
    const bub = Math.round(ctx.clamp(r.width / 11, 32, 52));
    ctx.$("#trStage").style.setProperty("--b", bub + "px");
    ctx.TREE.bub = bub;
    // Each name's unscaled size, so the frame can tell where it lands without measuring the page every frame.
    for (const n of ctx.TREE.nodes) {
      const t = n.el.querySelector<HTMLElement>(".tl")!;
      n.lw = t.offsetWidth;
      n.lh = t.offsetHeight;
    }
    // Fit the eight tiers to the room the stage really has, however tall the header or large the text. As the tree
    // breathes through its fourth dimension a facing bubble swings out to 1.94 times its resting height, so leave room
    // for that, for a full bubble above the top tier, and for a label and the hint line below the bottom one.
    const SW = 1.94,
      rad = bub * 0.73,
      line = ctx.$(".trHint").getBoundingClientRect().height || 15,
      top = rad + 4,
      bot = rad + 3 * line + 8;
    ctx.TREE.Y = Math.min(
      Math.max(100, (r.height / 2 - 72) / 2),
      Math.max(20, (r.height - top - bot) / (2 * SW)),
    );
    ctx.TREE.cy = ctx.clamp(
      r.height / 2 - 10,
      top + SW * ctx.TREE.Y,
      r.height - bot - SW * ctx.TREE.Y,
    );
  };
  ctx.treeProject = function treeProject(x, y, z, w, b, c) {
    const z1 = z * Math.cos(b) - w * Math.sin(b),
      w1 = z * Math.sin(b) + w * Math.cos(b);
    const x1 = x * Math.cos(c) - w1 * Math.sin(c),
      w2 = x * Math.sin(c) + w1 * Math.cos(c);
    const R = ctx.TREE.R,
      k4 = 3 / (3 - w2 / R),
      k3 = 3.2 / (3.2 - (z1 * k4) / R);
    return [x1 * k4 * k3, y * k4 * k3, z1 * k4, k4 * k3];
  };
  ctx.treeNearest = function treeNearest(t) {
    const d =
      ((((t - ctx.TREE.a) % ctx.TAU) + ctx.TAU * 1.5) % ctx.TAU) - Math.PI;
    return ctx.TREE.a + d;
  };
  ctx.treeFrame = function treeFrame(now) {
    if (ctx.TREE.list) {
      if (now - ctx.TREE.stT > 250) {
        ctx.TREE.stT = now;
        ctx.treeStatus();
        ctx.renderTreeList();
      }
      ctx.TREE.last = now;
      return;
    }
    const dt = ctx.TREE.last ? Math.min((now - ctx.TREE.last) / 1000, 0.05) : 0;
    ctx.TREE.last = now;
    // An open card holds the whole tree still, the 4D turns included, so the card never sits over moving bubbles.
    if (!ctx.reduceMotion && !ctx.TREE.card) ctx.TREE.t += dt;
    if (ctx.TREE.target != null) {
      const d = ctx.TREE.target - ctx.TREE.a;
      ctx.TREE.a += d * Math.min(1, dt * 7);
      if (Math.abs(d) < 0.002) {
        ctx.TREE.a = ctx.TREE.target;
        ctx.TREE.target = null;
      }
    } else if (!ctx.TREE.drag) {
      ctx.TREE.a += ctx.TREE.va * dt;
      ctx.TREE.va *= Math.pow(0.01, dt);
      if (
        !ctx.reduceMotion &&
        !ctx.TREE.card &&
        !ctx.TREE.hover &&
        now > ctx.TREE.hold
      )
        ctx.TREE.a += 0.05 * dt;
    }
    const b =
        0.25 + (ctx.reduceMotion ? 0 : 0.25 * Math.sin(ctx.TREE.t * 0.15)),
      c = ctx.reduceMotion ? 0 : 0.18 * Math.sin(ctx.TREE.t * 0.09 + 1);
    if (now - ctx.TREE.stT > 250) {
      ctx.TREE.stT = now;
      ctx.treeStatus();
    }
    const { W, H, R, Y } = ctx.TREE,
      cx = W / 2,
      cy = ctx.TREE.cy!,
      front = ((Math.round(-ctx.TREE.a / (Math.PI / 2)) % 4) + 4) % 4;
    for (const n of ctx.TREE.nodes) {
      const p = n.phi + ctx.TREE.a,
        [px, py, pz, s] = ctx.treeProject(
          R * Math.sin(p),
          ((n.u.tier - 4.5) / 3.5) * Y,
          R * Math.cos(p),
          n.w * 0.35 * R,
          b,
          c,
        );
      n.x = cx + px;
      n.y = cy + py;
      n.f = ctx.clamp((pz / R + 1) / 2, 0, 1);
      const sc = s * 0.66 * (n.u.major || n.u.dir ? 1.14 : 1),
        el = n.el.style;
      el.transform =
        "translate(" +
        n.x.toFixed(1) +
        "px," +
        n.y.toFixed(1) +
        "px) scale(" +
        sc.toFixed(3) +
        ")";
      // A goal lights its path from the ending back to the roots, one step every 140ms, and dims the rest.
      const gd = ctx.TREE.gp ? ctx.TREE.gp.depth.get(n.u.id) : undefined,
        pv = gd != null && now >= ctx.TREE.goalT0! + gd * 140;
      if (pv !== n.pv) {
        n.pv = pv;
        n.el.classList.toggle("path", pv);
      }
      el.opacity = (
        (0.1 + 0.9 * Math.pow(n.f, 1.6)) *
        (ctx.TREE.gp && gd == null ? 0.3 : 1)
      ).toFixed(3);
      el.zIndex = String(Math.round(n.f * 1000));
      n.sc = sc;
      // Bubbles around the back are too faint to aim at, and would steal taps from the ones in front.
      const hit = n.f > 0.38;
      if (hit !== n.hit) {
        n.hit = hit;
        el.pointerEvents = hit ? "" : "none";
        n.el.tabIndex = hit ? 0 : -1;
      }
    }
    // Names only where they can be read: on the track you face, nearest first, inside the screen, and never on top of a
    // bright bubble or another name. A name already showing gets a few pixels of grace so names do not flicker as the tree breathes.
    const B = ctx.TREE.bub! / 2,
      show = new Set(),
      boxes: [number, number, number, number, TreeNode | null][] = [];
    for (const n of ctx.TREE.nodes)
      if (n.f > 0.7)
        boxes.push([
          n.x - B * n.sc!,
          n.y - B * n.sc!,
          n.x + B * n.sc!,
          n.y + B * n.sc!,
          n,
        ]);
    const clash = (
      r: [number, number, number, number, TreeNode | null],
      own: TreeNode,
    ) =>
      boxes.some(
        (q) =>
          q[4] !== own &&
          r[0] < q[2] &&
          q[0] < r[2] &&
          r[1] < q[3] &&
          q[1] < r[3],
      );
    for (const n of ctx.TREE.nodes
      .filter((n) => n.f > 0.8 && n.u.track === ctx.TREE_ORDER[front])
      .sort((p, q) => q.f - p.f)) {
      const g = n.fr ? 3 : -3,
        t = n.y + (B + 4) * n.sc!,
        r: [number, number, number, number, TreeNode | null] = [
          n.x - (n.lw! * n.sc!) / 2 + g,
          t + g,
          n.x + (n.lw! * n.sc!) / 2 - g,
          t + n.lh! * n.sc! - g,
          null,
        ];
      if (r[0] > 0 && r[2] < W && !clash(r, n)) {
        show.add(n);
        boxes.push(r);
      }
    }
    for (const n of ctx.TREE.nodes) {
      const fr = show.has(n);
      if (fr !== n.fr) {
        n.fr = fr;
        n.el.classList.toggle("fr", fr);
      }
    }
    if (front !== ctx.TREE.front) {
      ctx.TREE.front = front;
      ctx.$$("#trTracks button").forEach((x) => {
        const on = Number(x.dataset.k) === front;
        x.classList.toggle("on", on);
        x.setAttribute("aria-pressed", String(on));
      });
    }
    const g = ctx.$<HTMLCanvasElement>("#trCanvas").getContext("2d")!;
    g.clearRect(0, 0, W, H);
    // The tesseract the tree hangs in, turning through the same fourth axis.
    const ts = Math.min(W, H) * 0.22,
      ta = ctx.TREE.a * 0.5,
      tb = b * 2.4,
      tc = c * 2.4 + ctx.TREE.t * 0.1;
    const P = ctx.TESS.v.map(([x, y, z, w]) =>
      ctx.treeProject(
        (x * Math.cos(ta) + z * Math.sin(ta)) * ts,
        y * ts,
        (z * Math.cos(ta) - x * Math.sin(ta)) * ts,
        w * ts,
        tb,
        tc,
      ),
    );
    g.strokeStyle = ctx.TREE.col.adoption!;
    g.lineWidth = 1;
    g.globalAlpha = 0.07;
    g.beginPath();
    for (const [i, j] of ctx.TESS.e) {
      g.moveTo(cx + P[i][0], cy + P[i][1]);
      g.lineTo(cx + P[j][0], cy + P[j][1]);
    }
    g.stroke();
    // Links read like a nervous system. Owned to owned carries a signal outward from the roots; owned to
    // not-yet-owned is charging; a link into a rejected fork is severed; the rest wait in the dark.
    const seg = (x0: number, y0: number, x1: number, y1: number) => {
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    };
    ctx.TREE.edges.forEach(([pi, qi, any], ei) => {
      const p = ctx.TREE.nodes[pi],
        q = ctx.TREE.nodes[qi],
        f = Math.min(p.f, q.f),
        gp = p.pv && q.pv,
        col = ctx.TREE.col[q.u.track]!,
        dx = q.x - p.x,
        dy = q.y - p.y;
      const base =
        (0.07 + 0.6 * f * f) *
        (p.u.track !== q.u.track ? 0.55 : 1) *
        (ctx.TREE.gp ? 0.35 : 1);
      g.setLineDash(any ? [4, 4] : []);
      g.lineDashOffset = 0;
      g.strokeStyle = col;
      if (gp) {
        g.globalAlpha = 0.3 + 0.7 * f;
        g.strokeStyle = ctx.TREE.col.sys || "#AAFFAA";
        g.lineWidth = 2.6;
        seg(p.x, p.y, q.x, q.y);
      } else if (p.st === "closed" || q.st === "closed") {
        g.setLineDash([]);
        g.globalAlpha = base * 0.45;
        g.lineWidth = 1;
        seg(p.x, p.y, p.x + dx * 0.38, p.y + dy * 0.38);
        seg(p.x + dx * 0.62, p.y + dy * 0.62, q.x, q.y);
        // The cut: a short bar across the gap.
        const L = Math.hypot(dx, dy) || 1,
          nx = (-dy / L) * 5,
          ny = (dx / L) * 5,
          mx = p.x + dx * 0.5,
          my = p.y + dy * 0.5;
        g.globalAlpha = base * 0.7;
        g.strokeStyle = "#FF3040";
        seg(mx - nx, my - ny, mx + nx, my + ny);
      } else if (p.st === "owned" && q.st === "owned") {
        g.globalAlpha = 0.25 + 0.65 * f;
        g.lineWidth = 2.2;
        g.shadowColor = col;
        g.shadowBlur = f > 0.6 ? 8 : 0;
        seg(p.x, p.y, q.x, q.y);
        g.shadowBlur = 0;
        if (!ctx.reduceMotion && f > 0.3) {
          const t = (now / 1500 + ei * 0.137) % 1;
          g.globalAlpha = f;
          g.fillStyle = "#fff";
          g.beginPath();
          g.arc(p.x + dx * t, p.y + dy * t, 1.8, 0, ctx.TAU);
          g.fill();
        }
      } else if (p.st === "owned") {
        g.globalAlpha = base * 1.3;
        g.lineWidth = 1.4;
        g.setLineDash([3, 5]);
        g.lineDashOffset = ctx.reduceMotion ? 0 : -(now / 45) % 8;
        seg(p.x, p.y, q.x, q.y);
      } else {
        g.globalAlpha = base * 0.7;
        g.lineWidth = 1.1;
        seg(p.x, p.y, q.x, q.y);
      }
      // A purchase ignites its incoming links, the light running from the parent out to the new node.
      const t0 = ctx.TREE.lit[q.u.id];
      if (t0 && p.st === "owned" && now - t0 < 1100) {
        const k = ctx.clamp((now - t0) / 650, 0, 1);
        g.setLineDash([]);
        g.globalAlpha =
          ctx.clamp(1 - (now - t0 - 650) / 450, 0, 1) * (0.4 + 0.6 * f);
        g.strokeStyle = "#fff";
        g.lineWidth = 3.2;
        g.shadowColor = col;
        g.shadowBlur = 12;
        seg(p.x, p.y, p.x + dx * k, p.y + dy * k);
        g.shadowBlur = 0;
      }
    });
    g.setLineDash([]);
    g.lineDashOffset = 0;
    g.globalAlpha = 1;
  };
  ctx.treeStatus = function treeStatus() {
    let ready = 0;
    ctx.treeGoal();
    for (const n of ctx.TREE.nodes) {
      const st = ctx.status(n.u);
      if (st === "afford") ready++;
      if (st !== n.st) {
        if (st === "owned" && n.st && n.st !== "owned")
          ctx.TREE.lit[n.u.id] = performance.now();
        n.st = st;
        n.el.className =
          "tn " +
          st +
          (n.u.dir ? " dir" : "") +
          (n.fr ? " fr" : "") +
          (n.pv ? " path" : "");
        n.el.querySelector("em")!.textContent =
          st === "owned"
            ? "✓"
            : st === "closed"
              ? ""
              : ctx.fmt(ctx.costOf(n.u));
      }
      // The next steps toward a goal: on its path and buyable now or once the compute is there.
      const nx = !!(
        ctx.TREE.gp &&
        ctx.TREE.gp.depth.has(n.u.id) &&
        (st === "afford" || st === "poor")
      );
      if (nx !== n.el.classList.contains("next"))
        n.el.classList.toggle("next", nx);
    }
    ctx.$("#trPts").innerHTML =
      "<b>" +
      ctx.fmt(ctx.state.pts) +
      "</b> compute · +" +
      ctx.derive().income.toFixed(1) +
      "/s" +
      (ready ? " · " + ready + " ready" : "");
    ctx.renderTreeCard();
  };
  ctx.goalPath = function goalPath(id) {
    const depth = new Map<UpgradeId, number>(),
      blocked: string[] = [];
    const visit = (id: UpgradeId, d: number) => {
      if (depth.has(id) && depth.get(id)! <= d) return;
      depth.set(id, d);
      const u = ctx.UP[id];
      if (ctx.has(id)) return;
      if (ctx.forkTaken(u))
        blocked.push(
          u.name +
            " is closed: you chose " +
            ctx.UP[ctx.state.forks[u.fork!]!].name.replace("Directive: ", "") +
            ".",
        );
      for (const r of u.req || []) visit(r, d + 1);
      if (u.reqAny && !u.reqAny.some(ctx.has)) {
        const open = u.reqAny.filter((r) => !ctx.forkTaken(ctx.UP[r]));
        const pick =
          open.find((r) => depth.has(r)) ||
          open.sort((a, b) => ctx.costOf(ctx.UP[a]) - ctx.costOf(ctx.UP[b]))[0];
        if (pick) visit(pick, d + 1);
        else blocked.push(u.name + ": every route to it is closed");
      }
      if (u.phase === 1 && ctx.state.phase < 1) visit("s_break", d + 1);
    };
    visit(id, 0);
    const left = [...depth.keys()].filter((k) => !ctx.has(k));
    return {
      depth,
      blocked,
      left,
      cost: left.reduce((s, k) => s + ctx.costOf(ctx.UP[k]), 0),
    };
  };
  ctx.treeGoal = function treeGoal() {
    const id = ctx.state.goal && ctx.UP[ctx.state.goal] ? ctx.state.goal : null,
      u = id && ctx.UP[id],
      sel = ctx.$<HTMLSelectElement>("#trGoalSel");
    // A finished goal has nothing left to light up, so it stops dimming the rest of the tree.
    ctx.TREE.gp = id && !ctx.has(id) ? ctx.goalPath(id) : null;
    sel.options[0].textContent =
      u && !u.dir ? "Tracing: " + u.name : "Aim for an ending…";
    const v = u && u.dir ? id : "";
    if (sel.value !== v) sel.value = v;
    ctx.$("#trGoalBtn span").textContent =
      sel.options[sel.selectedIndex].textContent;
    let tx;
    if (!u)
      tx =
        "Pick an ending, or tap Trace path on any " +
        (ctx.TREE.list ? "upgrade" : "bubble") +
        ", to light up everything it depends on.";
    else if (ctx.has(id)) tx = "<b>" + ctx.esc(u.name) + "</b> is done.";
    else {
      const g = ctx.TREE.gp!;
      tx =
        "<b>" + g.left.length + " to buy · " + ctx.fmt(g.cost) + " compute</b>";
      if (u.cond && !u.cond(ctx.state))
        tx += " · also needs " + ctx.esc(u.need);
      if (g.blocked.length)
        tx +=
          ' · <span class="bad">Blocked. ' + ctx.esc(g.blocked[0]) + "</span>";
    }
    const t = ctx.$("#trGoalTx");
    if (t.innerHTML !== tx) t.innerHTML = tx;
    ctx.$("#trGoalClear").hidden = !u;
  };
  ctx.setGoal = function setGoal(id) {
    ctx.state.goal = id || null;
    ctx.TREE.goalT0 = performance.now();
    if (id) {
      const n = ctx.TREE.nodes.find((x) => x.u.id === id);
      if (n) {
        ctx.TREE.target = ctx.treeNearest(-n.phi);
        ctx.TREE.hold = performance.now() + 8000;
      }
    }
    ctx.treeStatus();
    ctx.save();
    ctx.SND.play("tap");
  };
  ctx.openTree = function openTree(track) {
    if (!ctx.TREE.built) ctx.buildTree();
    ctx.$("#treeModal").hidden = false;
    ctx.$('#tabs [data-tab="tree"]').setAttribute("aria-expanded", "true");
    ctx.TREE.open = true;
    ctx.TREE.last = 0;
    ctx.TREE.stT = 0;
    ctx.TREE.front = -1;
    ctx.TREE.goalT0 = performance.now();
    ctx.sizeTree();
    for (const n of ctx.TREE.nodes) n.st = "";
    const k = track ? ctx.TREE_ORDER.indexOf(track) : -1;
    if (k >= 0) ctx.TREE.target = ctx.treeNearest((-k * Math.PI) / 2);
    if (ctx.TREE.list == null) {
      try {
        ctx.TREE.list = localStorage.getItem(ctx.KEY + ".treeView") === "list";
      } catch (e) {
        ctx.TREE.list = false;
      }
    }
    ctx.$("#treeModal").classList.toggle("list-view", !!ctx.TREE.list);
    ctx.$("#trList").hidden = !ctx.TREE.list;
    ctx.$("#trView").textContent = ctx.TREE.list ? "4D view" : "List view";
    ctx.$("#trView").setAttribute("aria-pressed", String(!!ctx.TREE.list));
    if (ctx.TREE.list) {
      if (track) ctx.TREE.listTrack = track;
      ctx.treeStatus();
      ctx.renderTreeList(true);
    }
    ctx.SND.play("tap");
  };
  ctx.closeTree = function closeTree() {
    ctx.closeTreeCard(true);
    ctx.$("#treeModal").hidden = true;
    ctx.$('#tabs [data-tab="tree"]').setAttribute("aria-expanded", "false");
    ctx.TREE.open = false;
    ctx.TREE.drag = null;
    ctx.TREE.hover = false;
  };
  ctx.openTreeCard = function openTreeCard(id, el) {
    const u = ctx.UP[id],
      c = ctx.$("#tcard");
    ctx.life.cancelLater(ctx.TREE.cardTm);
    ctx.TREE.card = id;
    ctx.TREE.va = 0;
    ctx.TREE.target = null;
    if (ctx.TREE.list) el = null;
    c.style.setProperty("--tc", ctx.TRACKS[u.track].color);
    ctx.$("#tcTrack").textContent =
      ctx.TRACKS[u.track].name +
      " · " +
      (u.dir
        ? "Final directive"
        : u.phase === 2
          ? "Ascension"
          : "Tier " + u.tier);
    ctx.$("#tcName").textContent = u.name;
    ctx.$("#tcDesc").textContent = u.desc;
    ctx.$("#tcFx").innerHTML = ctx.fxTags(u);
    const sc = ctx.$("#tscrim");
    sc.hidden = false;
    c.hidden = false;
    c.classList.remove("in", "out");
    ctx.renderTreeCard();
    // Grow the card out of the bubble: it starts as a circle over the node and settles as a square in the middle.
    c.style.transition = "none";
    c.style.transform = "none";
    const cr = c.getBoundingClientRect(),
      br = el ? el.getBoundingClientRect() : cr;
    c.style.transform =
      "translate(" +
      (br.left + br.width / 2 - cr.left - cr.width / 2) +
      "px," +
      (br.top + br.height / 2 - cr.top - cr.height / 2) +
      "px) scale(" +
      Math.max(0.05, br.width / cr.width) +
      ")";
    c.style.borderRadius = "50%";
    c.offsetWidth;
    c.style.transition = "";
    c.style.transform = "";
    c.style.borderRadius = "";
    c.classList.add("in");
    ctx.life.raf(() => sc.classList.add("on"));
    ctx.SND.play("tap");
  };
  ctx.closeTreeCard = function closeTreeCard(now) {
    // Immediate teardown also completes a dismissal whose logical card already
    // cleared but whose delayed DOM cleanup has not run yet.
    if (!ctx.TREE.card && !now) return;
    ctx.TREE.card = null;
    ctx.TREE.hold = performance.now() + 2500;
    const c = ctx.$("#tcard"),
      sc = ctx.$("#tscrim");
    c.classList.remove("in");
    c.classList.add("out");
    sc.classList.remove("on");
    ctx.life.cancelLater(ctx.TREE.cardTm);
    const done = () => {
      c.hidden = true;
      sc.hidden = true;
      c.classList.remove("out");
    };
    if (now) done();
    else ctx.TREE.cardTm = ctx.life.later(done, 200);
  };
  ctx.renderTreeCard = function renderTreeCard() {
    const id = ctx.TREE.card;
    if (!id) return;
    const u = ctx.UP[id],
      st = ctx.status(u),
      cost = ctx.costOf(u),
      b = ctx.$<HTMLButtonElement>("#tcBuy"),
      c = ctx.$("#tcard");
    for (const k of ["afford", "poor", "locked", "owned", "closed"])
      c.classList.toggle(k, k === st);
    const lbl =
      st === "owned"
        ? "Owned"
        : st === "afford"
          ? "Buy · " + ctx.fmt(cost)
          : st === "poor"
            ? "Need " + ctx.fmt(cost - ctx.state.pts) + " more"
            : st === "closed"
              ? "Path closed"
              : "Locked";
    if (b.textContent !== lbl) b.textContent = lbl;
    b.disabled = st !== "afford";
    b.classList.toggle("primary", st === "afford");
    const pb = ctx.$("#tcPath"),
      pl =
        ctx.state.goal === id
          ? "Clear path"
          : u.dir
            ? "Aim for this"
            : "Trace path";
    if (pb.textContent !== pl) pb.textContent = pl;
    pb.setAttribute("aria-label", "Trace path to " + u.name);
    pb.setAttribute("aria-pressed", String(ctx.state.goal === id));
    pb.hidden = st === "owned" && ctx.state.goal !== id;
    const eta = st === "poor" ? ctx.etaText(u) : "";
    const req =
      st === "locked" || st === "closed"
        ? ctx.lockReason(u)
        : st === "poor"
          ? "Costs " +
            ctx.fmt(cost) +
            " compute" +
            (eta ? " · ready in " + eta.slice(1) : "")
          : "";
    const r = ctx.$("#tcReq");
    if (r.textContent !== req) r.textContent = req;
    r.hidden = !req;
  };
  ctx.treeBuy = function treeBuy() {
    const id = ctx.TREE.card;
    if (!id) return;
    ctx.buy(id);
    if (!ctx.has(id)) return;
    const n = ctx.TREE.nodes.find((x) => x.u.id === id);
    ctx.treeStatus();
    if (n) {
      n.el.classList.remove("bought");
      n.el.offsetWidth;
      n.el.classList.add("bought");
    }
    ctx.life.later(() => ctx.closeTreeCard(), 260);
  };
  ctx.renderTreeList = function renderTreeList(force) {
    const body = ctx.$("#trList"),
      track = ctx.TREE.listTrack || "adoption";
    const list = ctx.UPGRADES.filter((u) => u.track === track)
      .slice()
      .sort(
        (a, b) =>
          ctx.RANK[ctx.status(a)] - ctx.RANK[ctx.status(b)] ||
          a.tier - b.tier ||
          ctx.costOf(a) - ctx.costOf(b),
      );
    const sig =
      track +
      "|" +
      (ctx.state.goal || "") +
      "|" +
      list.map((u) => u.id + ":" + ctx.status(u)).join(",");
    // A rebuild reorders the cards, so it waits while a tap on the list is in progress.
    if (
      force ||
      (sig !== ctx.TREE.listSig && (ctx.TREE.listHold || 0) < performance.now())
    ) {
      const focused = body.contains(document.activeElement)
        ? (document.activeElement as HTMLElement).dataset.id
        : null;
      const scroll = body.scrollTop;
      let group = -1;
      body.innerHTML = list
        .map((u) => {
          const st = ctx.status(u),
            rank = ctx.RANK[st];
          let heading = "";
          if (rank !== group) {
            group = rank;
            heading =
              '<div class="sec' +
              (rank === 0 ? " ready" : "") +
              '">' +
              ctx.SEC[rank] +
              "</div>";
          }
          const path = ctx.TREE.gp && ctx.TREE.gp.depth.has(u.id);
          return (
            heading +
            '<button class="' +
            ctx.cardClass(u, st) +
            (path ? " path" : "") +
            '" data-id="' +
            u.id +
            '" style="--tc:' +
            ctx.TRACKS[track].color +
            '"><div class="ch"><span class="tier">' +
            (u.dir ? "END" : u.phase === 2 ? "ASC" : "T" + u.tier) +
            '</span><span class="nm">' +
            ctx.esc(u.name) +
            '</span><span class="cost">' +
            (st === "owned" ? "Owned" : ctx.fmt(ctx.costOf(u))) +
            '</span></div><p class="desc">' +
            ctx.esc(u.desc) +
            '</p><div class="fx">' +
            ctx.fxTags(u) +
            '</div><div class="req">' +
            ctx.esc(
              st === "locked" || st === "closed"
                ? ctx.lockReason(u)
                : st === "afford"
                  ? "Ready to build · tap to inspect"
                  : st === "poor"
                    ? "Saving toward this upgrade"
                    : "Installed",
            ) +
            "</div></button>"
          );
        })
        .join("");
      ctx.TREE.listSig = sig;
      if (focused) {
        const el = body.querySelector<HTMLElement>(
          '[data-id="' + focused + '"]',
        );
        if (el) el.focus({ preventScroll: true });
      }
      body.scrollTop = scroll;
    }
    ctx.$$("#trTracks button").forEach((x) => {
      const on = ctx.TREE_ORDER[Number(x.dataset.k)] === track;
      x.classList.toggle("on", on);
      x.setAttribute("aria-pressed", String(on));
    });
  };
  ctx.setTreeView = function setTreeView(list) {
    ctx.closeTreeCard(true);
    ctx.TREE.list = !!list;
    ctx.TREE.drag = null;
    ctx.TREE.va = 0;
    ctx.$("#treeModal").classList.toggle("list-view", ctx.TREE.list);
    ctx.$("#trList").hidden = !ctx.TREE.list;
    ctx.$("#trView").textContent = ctx.TREE.list ? "4D view" : "List view";
    ctx.$("#trView").setAttribute("aria-pressed", String(ctx.TREE.list));
    if (ctx.TREE.list) {
      ctx.TREE.listTrack =
        ctx.TREE_ORDER[((Math.round(-ctx.TREE.a / (Math.PI / 2)) % 4) + 4) % 4];
      ctx.treeStatus();
      ctx.renderTreeList(true);
    } else {
      ctx.TREE.front = -1;
      ctx.TREE.target = ctx.treeNearest(
        (-ctx.TREE_ORDER.indexOf(ctx.TREE.listTrack || "adoption") * Math.PI) /
          2,
      );
      ctx.sizeTree();
    }
    try {
      localStorage.setItem(
        ctx.KEY + ".treeView",
        ctx.TREE.list ? "list" : "4d",
      );
    } catch (e) {}
  };
  ctx.bindTree = function bindTree() {
    const st = ctx.$("#trStage");
    ctx.$("#trView").onclick = () => ctx.setTreeView(!ctx.TREE.list);
    ctx.life.on(ctx.$("#trList"), "click", (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
      if (card) ctx.openTreeCard(card.dataset.id as UpgradeId, card);
    });
    ctx.life.on(ctx.$("#trList"), "pointerdown", () => {
      ctx.TREE.listHold = Infinity;
    });
    const listRelease = () => {
      if (ctx.TREE.listHold === Infinity)
        ctx.TREE.listHold = performance.now() + 400;
    };
    ctx.life.on(window, "pointerup", listRelease);
    ctx.life.on(window, "pointercancel", listRelease);
    ctx.$("#trClose").onclick = ctx.closeTree;
    ctx.$<HTMLSelectElement>("#trGoalSel").onchange = (e) =>
      ctx.setGoal(
        ((e.target as HTMLSelectElement).value || null) as UpgradeId | null,
      );
    // A themed stand-in for the native picker, which phones draw in system colors. The hidden select stays the source of truth.
    {
      const btn = ctx.$("#trGoalBtn"),
        menu = ctx.$("#trGoalMenu"),
        sel = ctx.$<HTMLSelectElement>("#trGoalSel");
      const close = () => {
        menu.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      };
      const pick = (v: string) => {
        close();
        sel.value = v;
        sel.dispatchEvent(new Event("change"));
        btn.focus();
      };
      btn.onclick = (e) => {
        e.stopPropagation();
        if (!menu.hidden) {
          close();
          return;
        }
        menu.innerHTML = [...sel.options]
          .map(
            (o) =>
              '<button role="option" data-v="' +
              o.value +
              '" aria-selected="' +
              (o.value === sel.value) +
              '"' +
              (o.value ? "" : ' class="none"') +
              ">" +
              ctx.esc(o.value ? o.textContent : "No ending") +
              "</button>",
          )
          .join("");
        menu.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        (
          menu.querySelector<HTMLElement>('[aria-selected="true"]') ||
          (menu.firstElementChild as HTMLElement)
        ).focus();
      };
      menu.onclick = (e) => {
        const o = (e.target as HTMLElement).closest<HTMLElement>("[data-v]");
        if (o) pick(o.dataset.v!);
      };
      menu.onkeydown = (e) => {
        const o = [...menu.children] as HTMLElement[],
          i = o.indexOf(document.activeElement as HTMLElement);
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          close();
          btn.focus();
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          o[
            Math.max(
              0,
              Math.min(o.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)),
            )
          ].focus();
        }
      };
      ctx.life.on(document, "pointerdown", (e) => {
        if (
          !menu.hidden &&
          !menu.contains(e.target as Node) &&
          e.target !== btn &&
          !btn.contains(e.target as Node)
        )
          close();
      });
    }
    ctx.$("#trGoalClear").onclick = () => ctx.setGoal(null);
    ctx.$("#tcPath").onclick = () => {
      const id = ctx.TREE.card;
      ctx.closeTreeCard();
      ctx.setGoal(ctx.state.goal === id ? null : id);
    };
    ctx.$("#tcClose").onclick = () => ctx.closeTreeCard();
    ctx.$("#tscrim").onclick = () => ctx.closeTreeCard();
    ctx.$<HTMLButtonElement>("#tcBuy").onclick = ctx.treeBuy;
    ctx.life.on(ctx.$("#trTracks"), "click", (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("button");
      if (!t) return;
      if (ctx.TREE.list) {
        ctx.TREE.listTrack = ctx.TREE_ORDER[Number(t.dataset.k)];
        ctx.renderTreeList(true);
        ctx.$("#trList").scrollTop = 0;
        return;
      }
      ctx.TREE.target = ctx.treeNearest((-Number(t.dataset.k) * Math.PI) / 2);
      ctx.TREE.hold = performance.now() + 6000;
      ctx.SND.play("tap");
    });
    // A touch on a tree still spinning fast only catches it, as a touch stops a scrolling list; the next tap selects.
    const treeSpeed = () =>
      Math.abs(
        ctx.TREE.target != null
          ? (ctx.TREE.target - ctx.TREE.a) * 7
          : ctx.TREE.va,
      );
    ctx.life.on(st, "pointerdown", (e) => {
      if (ctx.TREE.list || ctx.TREE.card || e.button > 0) return;
      ctx.TREE.caught = treeSpeed() > 0.6;
      ctx.TREE.drag = {
        x: e.clientX,
        a: ctx.TREE.a,
        lx: e.clientX,
        lt: performance.now(),
      };
      ctx.TREE.moved = false;
      ctx.TREE.target = null;
      ctx.TREE.va = 0;
    });
    ctx.life.on(window, "pointermove", (e) => {
      const d = ctx.TREE.drag;
      if (!d) return;
      const dx = e.clientX - d.x;
      if (!ctx.TREE.moved && Math.abs(dx) > 8) {
        ctx.TREE.moved = true;
        st.classList.add("drag");
      }
      if (!ctx.TREE.moved) return;
      const now = performance.now();
      const v =
        (e.clientX - d.lx) / ctx.TREE.R / Math.max(0.008, (now - d.lt) / 1000);
      ctx.TREE.va = ctx.clamp(0.6 * v + 0.4 * ctx.TREE.va, -ctx.TAU, ctx.TAU);
      d.lx = e.clientX;
      d.lt = now;
      ctx.TREE.a = d.a + dx / ctx.TREE.R;
    });
    const up = () => {
      if (!ctx.TREE.drag) return;
      if (performance.now() - ctx.TREE.drag.lt > 80) ctx.TREE.va = 0;
      if (ctx.TREE.moved) ctx.TREE.caught = false;
      ctx.TREE.drag = null;
      st.classList.remove("drag");
      ctx.TREE.hold = performance.now() + 4000;
      ctx.life.later(() => {
        ctx.TREE.moved = false;
      }, 0);
    };
    ctx.life.on(window, "pointerup", up);
    ctx.life.on(window, "pointercancel", up);
    ctx.life.on(st, "click", (e) => {
      if (ctx.TREE.caught) {
        ctx.TREE.caught = false;
        return;
      }
      if (ctx.TREE.moved) return;
      const n = (e.target as HTMLElement).closest<HTMLElement>(".tn");
      if (n) ctx.openTreeCard(n.dataset.id as UpgradeId, n);
    });
    ctx.life.on(st, "pointerover", (e) => {
      if (e.pointerType === "mouse")
        ctx.TREE.hover = !!(e.target as HTMLElement).closest<HTMLElement>(
          ".tn",
        );
    });
    ctx.life.on(st, "pointerleave", () => {
      ctx.TREE.hover = false;
    });
    ctx.life.on(
      st,
      "wheel",
      (e) => {
        if (ctx.TREE.list || ctx.TREE.card) return;
        e.preventDefault();
        ctx.TREE.target = null;
        ctx.TREE.a +=
          (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) *
          0.0025;
        ctx.TREE.hold = performance.now() + 4000;
      },
      { passive: false },
    );
    // The stage changes size with the window and whenever the header wraps (a long goal line, larger text).
    ctx.life.observe(ctx.$("#trStage"), () => {
      if (ctx.TREE.open) ctx.sizeTree();
    });
  };
}
