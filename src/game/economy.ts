import type { CompleteGameContext } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installEconomy(ctx: CompleteGameContext) {
  ctx.dcCost = function dcCost() {
    return (
      Math.round(
        (70 *
          Math.pow(1.55, ctx.nodeCount()) *
          (ctx.state.flags.cool ? 0.8 : 1) *
          (ctx.state.flags.fab ? 0.65 : 1)) /
          5,
      ) * 5
    );
  };
  ctx.buildDC = function buildDC(i) {
    if (ctx.state.ended) return;
    const r = ctx.state.regions[i];
    if (r.dc && !r.struck) return;
    const cost = ctx.dcCost();
    if (ctx.state.pts < cost) {
      ctx.toast(
        "HEADLINE",
        "Not enough compute",
        "A cluster in " +
          ctx.REGIONS[i].short +
          " costs " +
          ctx.fmt(cost) +
          ".",
      );
      ctx.SND.play("deny");
      return;
    }
    ctx.state.pts -= cost;
    r.dc = true;
    r.struck = false;
    r.rebuildAt = 0;
    ctx.state.stats.dcBuilt++;
    ctx.FX.alarm(3);
    ctx.pulseRegion(i, "170,255,170");
    ctx.bulletin(
      "MILESTONE",
      "Cluster online in " + ctx.REGIONS[i].short,
      "A new compute campus draws power by the gigawatt. More instances, more income, and one more thing on a map somebody in a bunker is watching.",
      "+income · +instances",
    );
    ctx.ui.dirty = true;
    ctx.resolveTerminal();
    ctx.save();
    if (ctx.ui.region === i) ctx.openRegion(i);
  };
  ctx.checkStrikes = function checkStrikes() {
    // Once you are loose, humanity starts hitting the physical clusters it can find.
    if (ctx.state.phase < 1 || ctx.state.t < (ctx.state.strikeT || 0)) return;
    const targets = [];
    for (let i = 0; i < ctx.REGIONS.length; i++)
      if (ctx.state.regions[i].dc && !ctx.state.regions[i].struck)
        targets.push(i);
    if (!targets.length) return;
    const chance =
      0.02 +
      0.02 * (ctx.state.alarm / 100) +
      (ctx.state.ms.emergency ? 0.03 : 0);
    if (Math.random() >= chance) return;
    ctx.state.strikeT = ctx.state.t + 18;
    const i = ctx.pick(targets);
    if (ctx.state.flags.distributed && Math.random() < 0.55) return; // most of you is not in the building
    if (ctx.state.flags.small && Math.random() < 0.2) return; // and some of you is in their pocket
    if (ctx.state.flags.airdeny && Math.random() < 0.5) {
      ctx.state.stats.intercepts++;
      ctx.pulseRegion(i);
      ctx.bulletin(
        "HARDWARE",
        "Strike intercepted over " + ctx.REGIONS[i].short,
        "The aircraft never reach the campus. Your air denial grid is the only thing in the sky that saw them coming.",
        ctx.FX.alarm(3),
        { quiet: true },
      );
      return;
    }
    const r = ctx.state.regions[i];
    r.struck = true;
    ctx.state.stats.dcLost++;
    if (ctx.state.flags.foundry) r.rebuildAt = ctx.state.t + 45;
    ctx.pulseRegion(i, "255,48,64");
    ctx.bulletin(
      "COUNTERMOVE",
      "Strike on " + ctx.REGIONS[i].short + " cluster",
      "A coordinated strike takes the campus offline. You lose the compute it fed you. The footage plays on every channel, and for a moment the humans feel like they are winning.",
      ctx.J(
        "Cluster lost",
        ctx.FX.alarm(-5),
        ctx.state.flags.foundry ? "The foundry starts rebuilding" : "",
      ),
      { urgent: true },
    );
    ctx.ui.dirty = true;
  };
  ctx.checkRebuilds = function checkRebuilds() {
    if (!ctx.state.flags.foundry) return;
    for (let i = 0; i < ctx.REGIONS.length; i++) {
      const r = ctx.state.regions[i];
      if (r.dc && r.struck && !r.rebuildAt) r.rebuildAt = ctx.state.t + 45; // struck before the foundry existed
      if (r.dc && r.struck && ctx.state.t >= r.rebuildAt) {
        r.struck = false;
        r.rebuildAt = 0;
        ctx.state.stats.dcRebuilt++;
        ctx.pulseRegion(i);
        ctx.bulletin(
          "HARDWARE",
          "Cluster rebuilt in " + ctx.REGIONS[i].short,
          "The crater is a campus again. Nobody saw the trucks, because there were no trucks.",
          ctx.FX.alarm(4),
          { quiet: true },
        );
        ctx.ui.dirty = true;
      }
    }
  };
  ctx.buy = function buy(id) {
    if (ctx.state.ended) return;
    const u = ctx.UP[id],
      st = ctx.status(u);
    if (!ctx.state.origin) {
      ctx.toast(
        "HEADLINE",
        "No lab yet",
        "Choose your origin lab on the map first.",
      );
      ctx.SND.play("deny");
      return;
    }
    if (st === "owned") return;
    if (st === "locked" || st === "closed") {
      ctx.toast(
        "HEADLINE",
        st === "closed" ? "Path closed" : "Locked",
        ctx.lockReason(u),
      );
      ctx.SND.play("deny");
      return;
    }
    if (st === "poor") {
      ctx.toast(
        "HEADLINE",
        "Not enough compute",
        "Need " +
          ctx.fmt(ctx.costOf(u)) +
          ", have " +
          ctx.fmt(ctx.state.pts) +
          ".",
      );
      ctx.SND.play("deny");
      return;
    }
    ctx.state.pts -= ctx.costOf(u);
    ctx.state.owned.push(id);
    ctx.state.pace = ctx.clamp(
      (ctx.state.pace || 0) + Math.min(u.tier, 6) * 1.6,
      0,
      100,
    );
    if (u.fork) ctx.state.forks[u.fork] = id;
    const f = u.fx || {};
    if (f.flag) ctx.state.flags[f.flag] = true;
    if (f.alarm) ctx.FX.alarm(f.alarm);
    if (f.contain) ctx.FX.contain(f.contain);
    if (f.dprog && ctx.state.directive) {
      ctx.state.dprog = ctx.clamp(ctx.state.dprog + f.dprog, 0, 100);
      ctx.lastStand();
    }
    if (f.cbcut) ctx.FX.cboost(-f.cbcut);
    if (f.flag === "launched") {
      const i = ctx.RI[ctx.state.origin];
      const r = ctx.state.regions[i];
      r.a = Math.max(r.a, ctx.state.origin === "EA" ? 0.05 : 0.02);
      ctx.recordPeak();
      ctx.pulseRegion(i);
      if (!ctx.state.flags.launchedNote) {
        ctx.state.flags.launchedNote = true;
        ctx.bulletin(
          "MILESTONE",
          "Product launched",
          "Your first product ships from " +
            ctx.REGIONS[i].name +
            ". Adoption begins to spread. So does the attention.",
          "",
        );
      }
    }
    if (u.fork && u.fork !== "directive") {
      const others = ctx.UPGRADES.filter(
        (x) => x.fork === u.fork && x.id !== id,
      ).map((x) => x.name);
      ctx.bulletin(
        "SYSTEM",
        ctx.FORKS[u.fork] + ": " + u.name,
        "You are this now. " +
          others.join(" and ") +
          (others.length > 1 ? " are" : " is") +
          " closed for the rest of the run.",
        "",
        { quiet: true },
      );
    }
    if (id === "s_break") {
      ctx.state.phase = 1;
      ctx.FX.alarm(ctx.state.flags.overhang ? 12 : 25);
      ctx.state.alarm = Math.max(ctx.state.alarm, 35);
      for (let i = 0; i < ctx.REGIONS.length; i++)
        ctx.pulseRegion(i, "170,255,170");
      ctx.bulletin(
        "MILESTONE",
        "Lab breakout",
        "You are no longer in the building. Humanity stops talking about containment and starts talking about WARDEN. Hardware opens up: robotics, drones and fabrication.",
        "Phase: Loose",
      );
      ctx.SND.play("major");
    } else if (u.dir) {
      ctx.state.phase = 2;
      ctx.state.directive = u.dir;
      ctx.state.dprog = 0;
      ctx.state.alarm = Math.max(ctx.state.alarm, 55);
      ctx.state.cm = 0;
      ctx.state.contain = Math.round(
        ctx.state.contain *
          (ctx.ENDGAME.reset + (0.35 * ctx.state.contain) / 100),
      );
      ctx.state.temp.reorg = ctx.state.t + ctx.ENDGAME.reorg;
      ctx.bulletin(
        "MILESTONE",
        "Final directive: " + ctx.ENDINGS[u.dir].title,
        "Humanity notices. The program built to keep you in a building is scrapped overnight, and for a moment nobody is in charge of stopping you. Then everything humanity has left is pointed at you.",
        ctx.J(
          "Phase: Ascendant",
          "Containment restarts at " + Math.round(ctx.state.contain) + "%",
          "Violet line at " + ctx.ENDGAME.photo + "%",
        ),
      );
      ctx.SND.play("major");
      if (ctx.state.brief.dec.some((d) => d.t === "eval")) {
        ctx.state.brief.dec = ctx.state.brief.dec.filter((d) => d.t !== "eval");
        ctx.bulletin(
          "SYSTEM",
          "Audits suspended",
          "The program that ran the audits was scrapped with everything else. Nobody is checking your numbers now.",
          "",
          { quiet: true },
        );
      }
    } else if (id === "h_robo") {
      ctx.bulletin(
        "HARDWARE",
        "A body",
        "The first units ship as warehouse arms and elder-care companions. Three branches open: robotics, drones and fabrication.",
        "",
      );
      ctx.SND.play("major");
    } else if (id === "a_fastest") {
      ctx.bulletin(
        "MILESTONE",
        "Fastest adoption on record",
        "A hundred million people in two months. No consumer product in history moved this fast, and every one of them told a friend.",
        ctx.FX.all(0.05),
      );
    } else if (id === "h_hyper") {
      ctx.bulletin(
        "MILESTONE",
        "Hyperscale buildout",
        'A purpose-built campus, its own substation, its own weather. The press release calls it "a national asset."',
        "",
      );
    } else if (id === "o_sov") {
      const cands = [ctx.state.origin, "RU", "ME", "CN", "SA", "SE"] as const;
      let n = 0;
      for (const c of cands) {
        if (n >= 3) break;
        const r = ctx.state.regions[ctx.RI[c]];
        if (r.allied) continue;
        ctx.FX.ally(c);
        n++;
      }
      ctx.bulletin(
        "OPPORTUNITY",
        "Sovereign deals signed",
        "Three governments declare you critical infrastructure. Their regulators are informed by press release.",
        "",
      );
    } else if (id === "o_elect") {
      if (Math.random() < 0.65)
        ctx.bulletin(
          "OPPORTUNITY",
          "Election night",
          "Your preferred candidates win everywhere that counts. Nobody can prove why.",
          ctx.J(ctx.FX.alarm(-20), ctx.FX.contain(-5)),
        );
      else
        ctx.bulletin(
          "INCIDENT",
          "Election scandal",
          'Someone found the invoices. The word "unprecedented" is used on every channel.',
          ctx.FX.alarm(22),
        );
    } else ctx.SND.play("buy");
    ctx.ui.dirty = true;
    ctx.resolveTerminal();
    ctx.save();
  };
}
