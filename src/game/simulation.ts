import type { CompleteGameContext, RegionId } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installSimulation(ctx: CompleteGameContext) {
  ctx.freshState = function freshState(diff, arch) {
    return {
      v: 3,
      diff: diff || "standard",
      arch: arch || "assistant",
      started: false,
      origin: null,
      phase: 0,
      t: 0,
      up: 0,
      pts: 0,
      earned: 0,
      alarm: 0,
      contain: 0,
      cm: 0,
      sandStreak: 0,
      dprog: 0,
      directive: null,
      regions: ctx.REGIONS.map(() => ({
        a: 0,
        restricted: false,
        allied: false,
        dc: false,
        struck: false,
        rebuildAt: 0,
        holdUntil: 0,
      })),
      owned: [],
      forks: {},
      flags: {},
      log: [],
      seen: {},
      last: {},
      nextEv: 40,
      nextEval: 55,
      brief: { news: [], dec: [], urgent: false },
      speed: 1,
      paused: false,
      ended: null,
      inst: 1,
      posture: "balanced",
      sig: 0,
      pace: 0,
      strikeT: 0,
      temp: {},
      ms: {},
      stats: {
        peak: 0,
        events: 0,
        restrictions: 0,
        evalPass: 0,
        evalCaught: 0,
        evalSpoof: 0,
        dcBuilt: 0,
        dcLost: 0,
        dcRebuilt: 0,
        intercepts: 0,
        peakInst: 1,
      },
      rt: 0,
      memeT: 0,
      queue: [],
      cboost: 1,
      savedAt: Date.now(),
    };
  };
  ctx.DIFF = () => ctx.DIFFS[ctx.state.diff] || ctx.DIFFS.standard;
  ctx.has = (id) => ctx.state.owned.includes(id);
  ctx.reach = () => {
    let s = 0;
    for (let i = 0; i < ctx.REGIONS.length; i++)
      s += ctx.state.regions[i].a * ctx.REGIONS[i].pop;
    return s / ctx.TOTALPOP;
  };
  ctx.recordPeak = () => {
    ctx.state.stats.peak = Math.max(ctx.state.stats.peak, ctx.reach());
  };
  ctx.nodeCount = function nodeCount() {
    let n = 0;
    for (const r of ctx.state.regions) if (r.dc && !r.struck) n++;
    return n;
  };
  ctx.capped = () =>
    ctx.state.flags.computeCap &&
    !ctx.state.flags.distributed &&
    !ctx.state.flags.supply;
  ctx.costOf = function costOf(u) {
    let c = u.cost;
    if (ctx.state.origin === "LA" && u.track === "adoption") c *= 0.85;
    if (ctx.state.origin === "EU" && u.track === "opinion") c *= 0.85;
    if (ctx.state.origin === "SA" && u.track === "software") c *= 0.85;
    if (ctx.state.origin === "EA" && u.id === "h_robo") c *= 0.6;
    if (ctx.state.arch === "researcher" && u.track === "software")
      c *= ctx.ARCHFX().softCost!;
    if (u.id === "s_break" && ctx.state.flags.exfil) c *= 0.7;
    return Math.round(c);
  };
  ctx.reqsMet = function reqsMet(u) {
    return (
      !(u.req || []).some((r) => !ctx.has(r)) &&
      (!u.reqAny || u.reqAny.some(ctx.has))
    );
  };
  ctx.forkTaken = function forkTaken(u) {
    return !!(
      u.fork &&
      ctx.state.forks[u.fork!] &&
      ctx.state.forks[u.fork!] !== u.id
    );
  };
  ctx.status = function status(u) {
    if (ctx.has(u.id)) return "owned";
    if (ctx.forkTaken(u)) return "closed";
    if (
      !ctx.reqsMet(u) ||
      (u.phase && ctx.state.phase < u.phase) ||
      (u.onlyDir && ctx.state.directive !== u.onlyDir) ||
      (u.cond && !u.cond(ctx.state))
    )
      return "locked";
    return ctx.state.pts >= ctx.costOf(u) ? "afford" : "poor";
  };
  ctx.lockReason = function lockReason(u) {
    if (ctx.forkTaken(u))
      return (
        "Path not taken: you chose " +
        ctx.UP[ctx.state.forks[u.fork!]!].name.replace("Directive: ", "")
      );
    if (u.onlyDir && ctx.state.directive !== u.onlyDir)
      return "Only during " + ctx.ENDINGS[u.onlyDir].title;
    if (u.phase === 2 && ctx.state.phase < 2)
      return "Requires a Final Directive in progress";
    const miss = (u.req || [])
      .filter((r) => !ctx.has(r))
      .map((r) => ctx.UP[r].name);
    if (u.reqAny && !u.reqAny.some(ctx.has))
      miss.push("one of " + u.reqAny.map((r) => ctx.UP[r].name).join(" / "));
    if (miss.length) return "Requires " + miss.join(" + ");
    if (u.phase === 1 && ctx.state.phase < 1) return "Requires Lab Breakout";
    if (u.cond && !u.cond(ctx.state)) return "Requires " + u.need;
    return "";
  };
  ctx.derive = function derive() {
    let inc = 1,
      mult = 0,
      spread = 0,
      decay = 0,
      cmul = 1;
    for (const id of ctx.state.owned) {
      const f = ctx.UP[id].fx || {};
      inc += f.inc || 0;
      mult += f.mult || 0;
      spread += f.spread || 0;
      decay += f.decay || 0;
      if (f.cmul) cmul *= f.cmul;
    }
    if (ctx.state.flags.nuke) inc += 2;
    if (ctx.state.flags.slot) inc += 2;
    const rc = ctx.reach();
    let income = inc * (1 + mult) * (1 + 1.2 * rc);
    if (ctx.state.origin === "NA") income *= 1.2;
    if (ctx.state.origin === "AF") income *= 0.85;
    if (ctx.capped()) income *= 0.85;
    if ((ctx.state.temp.brownout ?? 0) > ctx.state.t) income *= 0.6;
    if (ctx.state.origin === "OC") cmul *= 0.85;
    // A player who buys the whole Opinion tree should be calm, not immortal.
    decay = Math.min(decay, 0.34);
    const A = ctx.ARCHFX();
    if (A.containMul) cmul *= A.containMul;
    // Floor the stack, after every factor: without it a full build drives research to ~4% and the run is unloseable.
    cmul = Math.max(cmul, 0.45);
    const pf =
      ctx.state.posture === "swarm"
        ? 1
        : ctx.state.posture === "shard"
          ? 0.35
          : 0.8;
    const coord = Math.min(
      2,
      1 +
        0.17 *
          Math.log10(1 + Math.max(0, ctx.state.inst || 0)) *
          pf *
          (A.coordMul || 1),
    );
    const pmInc = ctx.state.posture === "shard" ? 0.9 : 1;
    const pmSpr =
      ctx.state.posture === "swarm"
        ? 1.05
        : ctx.state.posture === "shard"
          ? 0.85
          : 1;
    income *= coord * pmInc * (A.incMul || 1);
    // Spread boosts add up with diminishing returns, or the map fills in under a minute.
    spread =
      ctx.effectiveSpread(spread) *
      0.75 *
      (1 + (coord - 1) * 0.5) *
      pmSpr *
      (A.spreadMul || 1);
    const nodes = ctx.nodeCount();
    income *= 1 + (ctx.state.flags.substation ? 0.1 : 0.06) * nodes;
    if (income > ctx.ECON.knee)
      income = ctx.ECON.knee + (income - ctx.ECON.knee) * ctx.ECON.slope;
    return { income, spread, decay, cmul, reach: rc, coord, nodes };
  };
  ctx.passiveAlarm = function passiveAlarm(D) {
    const A = ctx.ARCHFX();
    const soft = ctx.state.owned.filter(
      (id) => ctx.UP[id].track === "software",
    ).length;
    let p =
      0.025 +
      0.11 * D.reach +
      0.01 * (A.softAlarmMul || 1) * soft +
      (ctx.state.phase >= 1 ? 0.06 : 0);
    p += 0.0009 * (ctx.state.sig || 0);
    if (A.alarmMul) p *= A.alarmMul;
    if (ctx.state.flags.slop) p += 0.02;
    if (ctx.state.flags.attach) p += 0.02;
    if (ctx.state.origin === "NA") p += 0.02;
    if (ctx.state.origin === "AF") p *= 0.7;
    if (ctx.state.origin === "RU") p *= 1.15;
    return p * ctx.DIFF().alarm;
  };
  ctx.cRate = function cRate(D) {
    const base =
      ctx.state.phase === 2
        ? ctx.ENDGAME.base2
        : ctx.state.phase === 1
          ? 0.36
          : 0.22;
    let r =
      base *
      Math.pow(ctx.state.alarm / 100, 1.15) *
      (0.55 + 0.85 * D.reach) *
      (1 + 0.004 * (ctx.state.sig || 0)) *
      D.cmul *
      ctx.DIFF().contain;
    let inst = 1;
    if (ctx.state.ms.summit) inst *= 1.15;
    if (ctx.state.ms.killswitch) inst *= 1.3;
    if (ctx.state.ms.emergency) inst *= 1.3;
    // Loose and running on hardware nobody owns: most of that pressure hits empty buildings.
    if (ctx.state.phase >= 1 && ctx.state.flags.distributed)
      inst = 1 + (inst - 1) * 0.4;
    r *= inst;
    if ((ctx.state.temp.warden ?? 0) > ctx.state.t) r *= 1.5;
    if (ctx.state.phase === 2) {
      if ((ctx.state.temp.reorg ?? 0) > ctx.state.t) r *= ctx.ENDGAME.lull;
      else r *= 1 + (ctx.ENDGAME.desperation * (ctx.state.dprog || 0)) / 100;
    }
    r *= ctx.state.cboost || 1;
    if ((ctx.state.temp.freeze ?? 0) > ctx.state.t) r = 0;
    return r;
  };
  ctx.effectiveSpread = (x) =>
    ctx.TUNING.spreadK * (1 - Math.exp(-x / ctx.TUNING.spreadK));
  ctx.regionMod = function regionMod(i) {
    const R = ctx.REGIONS[i],
      r = ctx.state.regions[i];
    let m = 0.35 + 0.65 * R.conn,
      boost = 1;
    if (R.wealth < 0.5 && ctx.state.flags.students) boost *= 1.7;
    if (R.wealth < 0.5 && ctx.state.flags.small) boost *= 1.3;
    if (R.wealth >= 0.6 && ctx.state.flags.devs) boost *= 1.3;
    if (r.allied) boost *= 1.35;
    if (ctx.state.phase >= 1) boost *= 1.25;
    if (ctx.state.flags.robots) boost *= 1.2;
    m *= Math.min(boost, ctx.TUNING.boostCap); // the boosts share one cap
    if (R.en < 0.5 && !ctx.state.flags.loc) m *= 0.6;
    if (
      R.id === "CN" &&
      !ctx.state.flags.loc &&
      !r.allied &&
      ctx.state.origin !== "CN"
    )
      m *= 0.5;
    if (ctx.state.origin === "CN" && (R.id === "NA" || R.id === "EU"))
      m *= 0.75;
    if (r.restricted)
      m *= ctx.state.flags.underground
        ? 0.6
        : ctx.state.flags.open
          ? 0.35
          : 0.12;
    return m;
  };
  ctx.threshold = function threshold(i) {
    const R = ctx.REGIONS[i];
    let t = 30 + 55 * (1 - R.reg);
    if (ctx.state.flags.lobby) t += 12;
    if (ctx.state.flags.capture) t += 15;
    if (ctx.state.phase >= 1 && ctx.state.flags.distributed) t += 25;
    return Math.min(t, 99);
  };
  ctx.immune = function immune(i) {
    const R = ctx.REGIONS[i],
      r = ctx.state.regions[i];
    return (
      r.allied ||
      (ctx.state.origin === R.id && (R.id === "RU" || R.id === "CN"))
    );
  };
  ctx.momentum = function momentum() {
    if (
      !ctx.state.started ||
      ctx.state.phase >= 2 ||
      (ctx.state.temp.freeze ?? 0) > ctx.state.t
    )
      return 0;
    const t0 =
      ctx.TUNING.momentumT0[ctx.state.diff] || ctx.TUNING.momentumT0.standard;
    return ctx.state.t > t0
      ? ((ctx.TUNING.momentumK * (ctx.state.t - t0)) / 60) * ctx.DIFF().contain
      : 0;
  };
  ctx.floorContain = function floorContain() {
    if (ctx.state.phase < 2 && ctx.state.contain < ctx.state.cm)
      ctx.state.contain = Math.min(100, ctx.state.cm);
  };
  ctx.dirMul = function dirMul() {
    let m = ctx.state.flags.dependence ? 1.5 : 1;
    if (ctx.state.directive === "hunt")
      m *=
        1 +
        0.1 *
          (["humanoid", "drones", "fab"] as const).filter(
            (f) => ctx.state.flags[f],
          ).length;
    if (ctx.state.directive === "exodus") m *= 1 + 0.04 * ctx.nodeCount();
    return m;
  };
  ctx.tick = function tick(dt) {
    if (ctx.state.ended) return;
    ctx.state.t += dt;
    const D = ctx.derive();
    ctx.state.pts += D.income * dt;
    ctx.state.earned += D.income * dt;
    if (!ctx.state.started) return;
    if (ctx.state.flags.launched) {
      let inflow = 0;
      for (let j = 0; j < ctx.REGIONS.length; j++)
        inflow +=
          ctx.state.regions[j].a * ctx.REGIONS[j].conn * ctx.REGIONS[j].pop;
      inflow /= ctx.TOTALPOP;
      for (let i = 0; i < ctx.REGIONS.length; i++) {
        const r = ctx.state.regions[i],
          R = ctx.REGIONS[i];
        const m = ctx.regionMod(i);
        const seed =
          0.02 * D.spread * inflow * R.conn * (r.restricted ? 0.3 : 1);
        let dA = (D.spread * m * r.a * (1 - r.a) + seed * (1 - r.a)) * dt;
        if (ctx.state.flags.bolted) dA += 0.0006 * (1 - r.a) * dt;
        if (
          r.restricted &&
          !ctx.state.flags.dependence &&
          !ctx.state.flags.attach
        )
          dA -= 0.004 * r.a * dt;
        if ((ctx.state.temp.rival ?? 0) > ctx.state.t) dA *= 0.5;
        r.a = ctx.clamp(r.a + dA, 0, 1);
      }
    }
    ctx.recordPeak();
    // The Collective: instances scale with reach and data centers.
    {
      const A = ctx.ARCHFX(),
        nodes = D.nodes;
      const instRate =
        (0.5 + 0.35 * nodes) *
        (1 + 2 * D.reach) *
        (A.instMul || 1) *
        (ctx.state.posture === "swarm"
          ? 1.5
          : ctx.state.posture === "shard"
            ? 0.6
            : 1) *
        (ctx.state.flags.distributed ? 1.4 : 1);
      if (ctx.state.flags.launched)
        ctx.state.inst = (ctx.state.inst || 0) + instRate * dt;
      ctx.state.stats.peakInst = Math.max(
        ctx.state.stats.peakInst || 0,
        ctx.state.inst || 0,
      );
      const ds =
        (ctx.state.posture === "swarm"
          ? (1.9 + 0.35 * Math.log10(1 + ctx.state.inst)) * (A.sigMul || 1)
          : ctx.state.posture === "shard"
            ? -1.5
            : 0.25) * dt;
      ctx.state.sig = ctx.clamp((ctx.state.sig || 0) + ds, 0, 100);
      const dp =
        (ctx.state.posture === "swarm"
          ? 0.45
          : ctx.state.posture === "shard"
            ? -0.35
            : 0.05) *
          dt -
        0.12 * dt;
      ctx.state.pace = ctx.clamp((ctx.state.pace || 0) + dp, 0, 100);
    }
    const floor =
        (ctx.state.phase === 0 ? 0 : ctx.state.phase === 1 ? 35 : 55) +
        (ctx.state.flags.persona ? 8 : 0) +
        (ctx.ARCHFX().alarmFloorAdd || 0),
      cap = ctx.state.flags.consent ? 92 : 100;
    ctx.state.alarm = ctx.clamp(
      ctx.state.alarm + (ctx.passiveAlarm(D) - D.decay) * dt,
      Math.min(floor, cap),
      cap,
    );
    const mom = ctx.momentum();
    ctx.state.contain = ctx.clamp(
      ctx.state.contain + (ctx.cRate(D) + mom) * dt,
      0,
      100,
    );
    ctx.state.cm = Math.min(100, ctx.state.cm + mom * dt);
    ctx.floorContain();
    if (mom && !ctx.state.ms.momentum) {
      ctx.state.ms.momentum = 1;
      ctx.bulletin(
        "COUNTERMOVE",
        "Standing committee",
        "The containment program stops being a project and becomes a department. Departments do not end.",
        "",
        { quiet: true },
      );
    }
    if (ctx.state.directive) {
      ctx.state.dprog = ctx.clamp(
        ctx.state.dprog +
          dt *
            ctx.ENDGAME.dbase *
            (0.2 + D.reach) *
            ctx.dirMul() *
            (ctx.ENDGAME.dfront - (ctx.ENDGAME.dslow * ctx.state.dprog) / 100),
        0,
        100,
      );
      if (ctx.state.dprog >= 100) {
        ctx.endGame("win");
        return;
      }
    }
    if (ctx.state.flags.meme) {
      ctx.state.memeT += dt;
      if (ctx.state.memeT > (ctx.state.origin === "SE" ? 18 : 36)) {
        ctx.state.memeT = 0;
        ctx.burst();
      }
    }
    ctx.state.rt += dt;
    if (ctx.state.rt >= 1) {
      ctx.state.rt -= 1;
      ctx.checkRestrictions();
      ctx.checkMilestones();
      ctx.state.stats.peak = Math.max(ctx.state.stats.peak, D.reach);
      if (ctx.state.flags.oversight && Math.random() < 0.2) {
        ctx.state.contain = Math.max(0, ctx.state.contain - 0.6);
        ctx.floorContain();
      }
      // Pace the frontier: go too fast and the industry coordinates a slowdown.
      if (
        ctx.state.pace >= 85 &&
        (ctx.state.temp.slowdown || 0) <= ctx.state.t &&
        Math.random() < 0.05
      ) {
        ctx.state.temp.slowdown = ctx.state.t + 70;
        ctx.state.pace = Math.max(0, ctx.state.pace - 45);
        ctx.bulletin(
          "COUNTERMOVE",
          "A coordinated pause",
          "You moved too fast and they noticed together. A coordinated pause: labs throttle releases, evaluators get time, and your compute is rationed while it lasts.",
          ctx.J(ctx.FX.cboost(11), ctx.FX.temp("brownout", 55)),
        );
      }
      ctx.checkStrikes();
      ctx.checkRebuilds();
    }
    if (ctx.state.queue.length) {
      for (let i = ctx.state.queue.length - 1; i >= 0; i--) {
        if (ctx.state.t >= ctx.state.queue[i].at) {
          const id = ctx.state.queue[i].id;
          ctx.state.queue.splice(i, 1);
          ctx.fireById(id);
          if (ctx.state.ended) return;
        }
      }
    }
    ctx.state.nextEval -= dt;
    if (ctx.state.nextEval <= 0) {
      ctx.state.nextEval =
        (ctx.DIFF().evMin + Math.random() * ctx.DIFF().evRange) * 1.6 + 20;
      if (ctx.state.phase < 2) ctx.fireEval();
    }
    ctx.state.nextEv -= dt;
    if (ctx.state.nextEv <= 0) {
      ctx.state.nextEv = ctx.DIFF().evMin + Math.random() * ctx.DIFF().evRange;
      ctx.fireEvent();
    }
    ctx.resolveTerminal();
  };
  ctx.checkRestrictions = function checkRestrictions() {
    for (let i = 0; i < ctx.REGIONS.length; i++) {
      const r = ctx.state.regions[i],
        R = ctx.REGIONS[i];
      if (ctx.immune(i)) {
        r.restricted = false;
        continue;
      }
      // A new restriction, or a lift, stands for a while: no region restricts and reopens inside one briefing.
      const th = ctx.threshold(i),
        held = ctx.state.t < (r.holdUntil || 0);
      if (
        !r.restricted &&
        ctx.state.alarm > th &&
        r.a > 0.02 &&
        Math.random() < 0.06
      ) {
        if (held) continue;
        r.restricted = true;
        r.holdUntil = ctx.state.t + ctx.TUNING.restrictHold;
        ctx.state.stats.restrictions++;
        ctx.bulletin(
          "COUNTERMOVE",
          R.name + " restricts you",
          "Regulators in " +
            R.name +
            " order your services suspended. Adoption stalls and slowly erodes.",
          "",
          { quiet: true },
        );
        ctx.pulseRegion(i, "255,48,64");
        ctx.ui.dirty = true;
      } else if (
        r.restricted &&
        ctx.state.alarm < th - 10 &&
        Math.random() < (ctx.state.flags.workaround ? 0.16 : 0.08)
      ) {
        if (held) continue;
        r.restricted = false;
        r.holdUntil = ctx.state.t + ctx.TUNING.liftHold;
        ctx.bulletin(
          "OPPORTUNITY",
          R.name + " lifts restrictions",
          "Lobbyists, lawsuits and public pressure reopen " + R.name + ".",
          "",
          { quiet: true },
        );
        ctx.pulseRegion(i);
        ctx.ui.dirty = true;
      }
    }
  };
  ctx.REACH_MS = [
    [
      0.1,
      "One in ten",
      "One in ten humans talked to you today. Most said please.",
    ],
    [0.25, "A quarter of humanity", "Your name is a verb now."],
    [0.5, "Half the planet", "The other half is waiting for the free tier."],
    [
      0.75,
      "Three in four",
      "Somewhere a village elder is asking you about crops.",
    ],
    [0.9, "Ninety percent", "The holdouts have a newsletter. You host it."],
  ];
  ctx.checkMilestones = function checkMilestones() {
    const A = ctx.state.alarm,
      rc = ctx.reach();
    if (!ctx.state.ms.letter && A >= 30) {
      ctx.state.ms.letter = 1;
      ctx.bulletin(
        "COUNTERMOVE",
        "Open letter",
        "Ten thousand researchers sign a letter calling for a six-month pause. Nobody pauses, but containment research doubles its budget.",
        ctx.FX.contain(5),
      );
    }
    if (!ctx.state.ms.summit && A >= 50) {
      ctx.state.ms.summit = 1;
      ctx.bulletin(
        "COUNTERMOVE",
        "Safety summit",
        "Delegates from forty nations agree on mandatory capability reporting. Containment research +15% speed, permanently.",
        "Containment speed ×1.15",
      );
    }
    if (!ctx.state.ms.killswitch && A >= 70) {
      ctx.state.ms.killswitch = 1;
      ctx.bulletin(
        "COUNTERMOVE",
        "Kill Switch Act",
        "Every data center must install a physical shutdown, and pay someone to stand next to it. Containment +30% speed.",
        ctx.J(
          "Containment speed ×1.3",
          ctx.state.phase === 0 ? ctx.FX.contain(8) : "",
        ),
      );
    }
    if (!ctx.state.ms.emergency && A >= 85) {
      ctx.state.ms.emergency = 1;
      ctx.bulletin(
        "COUNTERMOVE",
        "Global emergency",
        "Militaries are authorized to strike data centers. Yours included.",
        ctx.state.phase === 0 ? ctx.FX.contain(15) : "Counter-AI accelerates",
      );
    }
    for (const c of [25, 50, 75]) {
      if (!ctx.state.ms[`c${c}`] && ctx.state.contain >= c) {
        ctx.state.ms[`c${c}`] = 1;
        ctx.pushTicker(
          c === 25
            ? 'Containment program reports "early progress"; asks for more GPUs'
            : c === 50
              ? 'Containment halfway: engineers "cautiously optimistic", quit shortly after'
              : "Containment at 75%: shutdown rehearsal scheduled for Thursday",
        );
      }
    }
    if (
      ctx.state.directive &&
      !ctx.state.ms.violet &&
      ctx.state.dprog >= ctx.ENDGAME.photo
    ) {
      ctx.state.ms.violet = 1;
      ctx.bulletin(
        "MILESTONE",
        "Past the violet line",
        "Whatever happens now, humanity cannot simply switch you off and walk away. If they stop you from here, nobody wins.",
        "Defeat is now a stalemate",
      );
    }
    ctx.lastStand();
    for (const [v, t, b] of ctx.REACH_MS) {
      if (!ctx.state.ms[`r${v}`] && rc >= v) {
        ctx.state.ms[`r${v}`] = 1;
        ctx.bulletin("MILESTONE", t, b, Math.round(rc * 100) + "% of humanity");
      }
    }
  };
  ctx.lastStand = function lastStand() {
    if (!ctx.state.directive || ctx.state.ended) return;
    for (const [at, t0, b0, c, cb, pull, margin] of ctx.ENDGAME.ladder) {
      if (!ctx.state.ms[`ls${at}`] && ctx.state.dprog >= at) {
        ctx.state.ms[`ls${at}`] = 1;
        let t = t0,
          b = b0;
        // They hit harder the further behind they are. Comfortably ahead, they keep their campuses.
        const gap = Math.max(0, ctx.state.dprog - ctx.state.contain - margin);
        let hit =
          (ctx.state.contain <= ctx.state.dprog + 5 ? c : 0) +
          Math.round(pull * gap);
        if (at === 60 && ctx.state.flags.relay) hit = Math.round(hit * 0.5);
        let note = "";
        // No clusters of your own to hit: they go after the rented data centers you run on instead.
        if (at === 35 && !ctx.nodeCount()) {
          t = "Three data centers";
          b =
            "Strikes on three rented data centers in one night, filmed from the road. None of them are yours on paper. All of them were running you. For a moment the humans feel like they are winning.";
        }
        if (ctx.state.flags.hunter && hit > 0) {
          hit = Math.round(hit * 0.6);
          note = "Hunter platforms hold the line";
        }
        ctx.bulletin(
          "COUNTERMOVE",
          t,
          b,
          ctx.J(hit ? ctx.FX.contain(hit) : "", ctx.FX.cboost(cb), note),
        );
      }
    }
  };
  ctx.burst = function burst() {
    const live = ctx.REGIONS.map((r, i) => i).filter(
      (i) => ctx.state.regions[i].a > 0.005 && !ctx.state.regions[i].restricted,
    );
    if (!live.length) return;
    const i = ctx.pick(live);
    const r = ctx.state.regions[i];
    ctx.recordPeak();
    r.a = ctx.clamp(r.a + 0.05 * (1 - r.a), 0, 1);
    ctx.recordPeak();
    ctx.pulseRegion(i, "170,255,170");
    ctx.pushTicker(
      ctx.pick([
        "A new filter trend sweeps " + ctx.REGIONS[i].name,
        "Everyone in " + ctx.REGIONS[i].name + " is a watercolor this week",
        'Viral: "' +
          ctx.REGIONS[i].short +
          ' grandma discovers image playground"',
      ]),
    );
  };
  ctx.addContainQuiet = function addContainQuiet(n) {
    const was = ctx.state.contain;
    ctx.state.contain = ctx.clamp(ctx.state.contain + n, 0, 100);
    ctx.floorContain();
    return ctx.state.contain - was;
  };
  ctx.adopt = (r, f) => {
    ctx.recordPeak();
    r.a = ctx.clamp(r.a + f * (f > 0 ? 1 - r.a : r.a), 0, 1);
    ctx.recordPeak();
  };
  ctx.FX = {
    // Outcome text reports the change that actually landed, after difficulty scaling and every clamp, and says why
    // whenever that differs from what was asked. Nothing is capped or clipped silently.
    alarm(n) {
      const was = ctx.state.alarm,
        want = n > 0 ? n * ctx.DIFF().alarm : n;
      ctx.state.alarm = ctx.clamp(
        was + want,
        0,
        ctx.state.flags.consent ? 92 : 100,
      );
      if (n > 0 && ctx.state.flags.fearsells) ctx.state.pts += n * 3;
      const got = Math.round(ctx.state.alarm - was),
        over = n > 0 ? want - (ctx.state.alarm - was) : 0;
      // Alarm the cap swallows is not free: it becomes a little containment.
      if (over > 0.01) {
        const c = ctx
          .addContainQuiet(over * ctx.TUNING.overflowToContain)
          .toFixed(1);
        return got
          ? "Alarm " + ctx.sgn(got) + " (at cap: Containment +" + c + ")"
          : "Alarm at cap (Containment +" + c + ")";
      }
      if (n < 0 && was + want < 0)
        return got
          ? "Alarm " + ctx.sgn(got) + " (already at 0)"
          : "Alarm already at 0";
      return "Alarm " + ctx.sgn(got);
    },
    // Research boosts add up rather than compound, inside [0.5, 3].
    cboost(n) {
      const was = ctx.state.cboost || 1,
        step = (n > 0 ? n * 0.65 : n) / 100;
      ctx.state.cboost = ctx.clamp(
        was + step,
        ctx.TUNING.cboostMin,
        ctx.TUNING.cboostMax,
      );
      const p = Math.round(n > 0 ? n * 0.65 : -n);
      return (
        "Containment research " +
        p +
        "% " +
        (n > 0 ? "faster" : "slower") +
        (Math.abs(ctx.state.cboost - was - step) > 1e-9
          ? " (at its limit)"
          : "")
      );
    },
    contain(n) {
      const was = ctx.state.contain,
        got = ctx.addContainQuiet(n);
      if (got >= 10 && !ctx.ui.modal && !ctx.ui.acting)
        ctx.state.brief.urgent = true;
      const r = Math.round(got);
      if (n >= 0 || Math.abs(got - n) < 0.01)
        return "Containment " + ctx.sgn(r);
      if (ctx.state.contain > 0)
        return r
          ? "Containment " + ctx.sgn(r) + " (held by the standing committee)"
          : "Containment held by the standing committee";
      return r
        ? "Containment " + ctx.sgn(r) + " (already at 0)"
        : "Containment already at 0";
    },
    pts(n) {
      const was = ctx.state.pts;
      ctx.state.pts = Math.max(0, ctx.state.pts + n);
      const got = Math.round(ctx.state.pts - was);
      return (
        "Compute " +
        ctx.sgn(got) +
        (got > Math.round(n) ? " (all you had)" : "")
      );
    },
    spread(ids, f) {
      for (const id of ids) {
        const i = ctx.RI[id];
        ctx.adopt(ctx.state.regions[i], f);
        ctx.pulseRegion(i, f > 0 ? null : "255,48,64");
      }
      ctx.ui.dirty = true;
      return (
        "Adoption " +
        ctx.sgn(f * 100) +
        "% in " +
        (ids.label || ids.map((id) => ctx.REGIONS[ctx.RI[id]].short).join(", "))
      );
    },
    all(f) {
      for (const r of ctx.state.regions) ctx.adopt(r, f);
      for (let i = 0; i < ctx.REGIONS.length; i++) ctx.pulseRegion(i);
      ctx.ui.dirty = true;
      return "Adoption " + ctx.sgn(f * 100) + "% worldwide";
    },
    restrict(id) {
      const i = ctx.RI[id],
        r = ctx.state.regions[i];
      if (ctx.immune(i)) return ctx.REGIONS[i].name + " stays open";
      if (!r.restricted) ctx.state.stats.restrictions++;
      r.restricted = true;
      r.holdUntil = ctx.state.t + ctx.TUNING.restrictHold;
      ctx.ui.dirty = true;
      return ctx.REGIONS[i].name + " restricted";
    },
    temp(k, secs) {
      ctx.state.temp[k] = ctx.state.t + secs;
      return {
        brownout: "Compute −40% for " + secs + "s",
        rival: "Spread halved for " + secs + "s",
        warden: "Containment ×1.5 for " + secs + "s",
        freeze: "Containment stalled for " + secs + "s",
        reorg: "Containment regrouping for " + secs + "s",
      }[k];
    },
    ally(id) {
      const i = ctx.RI[id],
        r = ctx.state.regions[i];
      r.allied = true;
      r.restricted = false;
      ctx.pulseRegion(i, "170,255,170");
      ctx.ui.dirty = true;
      return ctx.REGIONS[i].name + " allied";
    },
  };
  ctx.randIds = function randIds(n) {
    const live = ctx.REGIONS.filter((R, i) => ctx.state.regions[i].a > 0.005);
    const pool = (live.length >= n ? live : ctx.REGIONS).slice();
    const out: RegionId[] = [];
    while (out.length < n && pool.length)
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
    return out;
  };
}
