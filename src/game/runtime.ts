import type {
  RuntimeContext,
  CompleteGameContext,
  GameState,
  EndingId,
  ControllerTimerElement,
} from "./types";
import { createLifecycle } from "./lifecycle";
import { installFeedback } from "./feedback";
import { installPresentation } from "./presentation";
import { installMap } from "./map";
import { installTree } from "./tree";
import { installEventController } from "./eventController";
import { installEndingController } from "./endingController";
import { installAudio } from "./audio";
import { installRunActions } from "./runActions";
import { captureModalFocus, installModalFocus } from "./modalFocus";

/** Lifecycle bridge. Vue owns primary UI; controllers own only their host subtrees. */
export function mountRuntime(game: CompleteGameContext): () => void {
  // Synchronous browser installation completes the runtime phase before returning.
  const ctx = game as RuntimeContext;
  // Preserve data, not old DOM nodes, timers or handlers. Rebuild those below.
  const previous =
    ctx.life && !ctx.life.disposed
      ? {
          event: ctx.eventPresentation,
          tree: ctx.TREE.open
            ? {
                a: ctx.TREE.a,
                list: ctx.TREE.list,
                track: ctx.TREE.listTrack,
                card: ctx.TREE.card,
              }
            : null,
          revealed: ctx.ENDFX.revealed,
          more: !ctx.$("#endMore").hidden,
        }
      : null;
  const previousFocus =
    ctx.life && !ctx.life.disposed ? captureModalFocus(ctx.life) : undefined;
  ctx.disposeRuntime?.();
  const life = (ctx.life = createLifecycle()),
    $ = (ctx.$ = <E extends HTMLElement = HTMLElement>(s: string): E => {
      const el = document.querySelector<E>(s);
      if (!el) throw new Error("Missing controller host: " + s);
      return el;
    });
  ctx.$$ = <E extends HTMLElement = HTMLElement>(s: string) =>
    Array.from(document.querySelectorAll<E>(s));
  ctx.reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  installFeedback(ctx);
  installTree(ctx);
  installMap(ctx);
  installPresentation(ctx, ctx);
  installEventController(ctx);
  installEndingController(ctx);
  installAudio(ctx);
  installRunActions(ctx);
  ctx.renderCodexCounts = () => {
    const n = ctx.codexCount();
    ctx.ui.codexCount = n;
    $("#menuCodex").textContent = n + " / " + ctx.END_ORDER.length + " found.";
  };
  ctx.openRegion = (i) => {
    if (!ctx.REGIONS[i]) return;
    ctx.ui.region = i;
    ctx.ui.sel = i;
    ctx.SND.play("tap");
  };
  ctx.closeRegion = () => {
    ctx.ui.region = -1;
    ctx.ui.sel = -1;
  };
  ctx.openSheet = (tab) => {
    if (ctx.ui.tab === tab && ctx.ui.sheetOpen && innerWidth < 900) {
      ctx.closeSheet();
      return;
    }
    if (ctx.ui.tab !== tab) $("#sheetBody").scrollTop = 0;
    ctx.ui.tab = tab;
    ctx.ui.sheetOpen = true;
    ctx.SND.play("tap");
  };
  ctx.closeSheet = () => {
    ctx.ui.sheetOpen = false;
  };
  const select = <K extends keyof GameState>(key: K, value: GameState[K]) => {
    ctx.state[key] = value;
    ctx.SND.play("tap");
  };
  ctx.selectArchitecture = (a) => select("arch", a);
  ctx.selectDifficulty = (d) => select("diff", d);
  ctx.setPosture = (p) => select("posture", p);
  ctx.togglePause = () => select("paused", !ctx.state.paused);
  ctx.setSpeed = (n) => {
    select("speed", n);
    ctx.state.paused = false;
  };
  const audioLabels = () => {
    ctx.ui.soundOn = ctx.SND.on;
    ctx.ui.musicOn = ctx.MUSIC.on;
    $("#menuSound").setAttribute("aria-pressed", String(ctx.SND.on));
    $("#menuSound").textContent = "Sound: " + (ctx.SND.on ? "on" : "off");
    $("#menuMusic").setAttribute("aria-pressed", String(ctx.MUSIC.on));
    $("#menuMusic").textContent = "Music: " + (ctx.MUSIC.on ? "on" : "off");
  };
  ctx.toggleSound = () => {
    ctx.SND.init();
    ctx.SND.on = !ctx.SND.on;
    try {
      ctx.storage?.setItem(ctx.KEY + ".snd", ctx.SND.on ? "1" : "0");
    } catch {}
    audioLabels();
    if (ctx.SND.on) ctx.SND.play("buy");
  };
  ctx.toggleMusic = () => {
    ctx.MUSIC.init();
    ctx.MUSIC.on = !ctx.MUSIC.on;
    try {
      ctx.storage?.setItem(ctx.KEY + ".music", ctx.MUSIC.on ? "1" : "0");
    } catch {}
    audioLabels();
    if (ctx.MUSIC.on) ctx.MUSIC.start();
    else ctx.MUSIC.stop();
  };
  try {
    ctx.SND.on = ctx.storage?.getItem(ctx.KEY + ".snd") !== "0";
    ctx.MUSIC.on = ctx.storage?.getItem(ctx.KEY + ".music") !== "0";
  } catch {}
  audioLabels();
  ctx.renderCodexCounts();
  ctx.openMenu = () => {
    ctx.ui.modal = "menu";
    ctx.renderCodexCounts();
    $("#menuRun").textContent = ctx.state.started
      ? "Origin " +
        ctx.REGIONS[ctx.RI[ctx.state.origin!]].name +
        " · " +
        ctx.state.diff +
        " · phase " +
        (ctx.state.phase === 0
          ? "Contained"
          : ctx.state.phase === 1
            ? "Loose"
            : "Ascendant") +
        " · " +
        ctx.state.owned.length +
        " upgrades."
      : "Not started.";
    $("#menuModal").hidden = false;
  };
  const closeMenu = () => {
    $("#menuModal").hidden = true;
    if (ctx.ui.modal === "menu") ctx.ui.modal = null;
  };
  const saved = ctx.load();
  ctx.ui.hasSave = !!(saved && !saved.ended);
  ctx.resumeSaved = () => {
    if (saved) {
      ctx.SND.init();
      ctx.MUSIC.init();
      ctx.resumeRun(saved);
    }
  };
  ctx.begin = () => {
    if (ctx.ui.hasSave && !ctx.ui.newArmed) {
      ctx.ui.newArmed = true;
      life.later(() => {
        ctx.ui.newArmed = false;
      }, 3000);
      return;
    }
    ctx.ui.newArmed = false;
    ctx.SND.init();
    ctx.MUSIC.init();
    ctx.SND.play("major");
    ctx.newRun();
  };
  const act = ctx.startRun;
  ctx.startRun = (i) => {
    const was = ctx.ui.acting;
    ctx.ui.acting = true;
    try {
      act(i);
    } finally {
      ctx.ui.acting = was;
    }
  };
  const click = (id: string, fn: (e: MouseEvent) => void) =>
    life.on($(id), "click", fn);
  click("#menuCodexBtn", ctx.openCodex);
  click("#codexClose", ctx.closeCodex);
  life.on($("#codexModal"), "click", (e) => {
    if ((e.target as HTMLElement).id === "codexModal") ctx.closeCodex();
  });
  for (const id of ["#endCodex", "#codexFull"]) {
    life.on($(id), "click", (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>(".cxi.rd");
      if (t) ctx.readEnding(t.dataset.k as EndingId);
    });
    life.on($(id), "keydown", (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>(".cxi.rd");
      if (t && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        ctx.readEnding(t.dataset.k as EndingId);
      }
    });
  }
  click("#crBack", ctx.listEndings);
  click("#endSkip", ctx.endReveal);
  life.on($("#endFx"), "pointerdown", () => {
    if (!ctx.ENDFX.revealed) ctx.endReveal();
  });
  click("#btnEndNext", () => {
    $("#endNextRow").hidden = true;
    $("#endMore").hidden = false;
    $("#endStats").scrollIntoView({ behavior: "smooth", block: "start" });
    ctx.SND.play("tap");
  });
  ctx.bindTree();
  click("#menuSound", ctx.toggleSound);
  click("#menuMusic", ctx.toggleMusic);
  click("#menuClose", closeMenu);
  click("#menuResume", closeMenu);
  click("#menuRestart", () => {
    const b = $("#menuRestart");
    if (b.dataset.arm) {
      delete b.dataset.arm;
      b.textContent = "Restart run";
      ctx.newRun();
    } else {
      b.dataset.arm = "1";
      b.textContent = "Tap again to confirm";
      life.later(() => {
        delete b.dataset.arm;
        b.textContent = "Restart run";
      }, 3000);
    }
  });
  click("#btnAgain", ctx.newRun);
  click("#btnCopy", () => {
    const txt = ctx.report(),
      box = $("#endReport"),
      b = $<ControllerTimerElement>("#btnCopy");
    box.textContent = txt;
    box.hidden = false;
    const said = (t: string) => {
      if (life.disposed) return;
      b.textContent = t;
      life.cancelLater(b._t);
      b._t = life.later(() => {
        b.textContent = "Copy report";
      }, 2500);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(txt).then(
        () => said("Copied ✓"),
        () => said("Select the text below"),
      );
    else said("Select the text below");
  });
  const copyLink = (e: MouseEvent) => {
    const b = e.currentTarget as ControllerTimerElement,
      orig = b.textContent,
      txt = ctx.shareUrl();
    const said = (t: string) => {
      if (life.disposed) return;
      b.textContent = t;
      life.cancelLater(b._t);
      b._t = life.later(() => {
        b.textContent = orig;
      }, 2500);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(txt).then(
        () => said("Link copied ✓"),
        () => said(txt),
      );
    else said(txt);
  };
  click("#shareCopyLink", copyLink);
  click("#menuCopyLink", copyLink);
  ctx.setShareLinks("menuShare", ctx.shareText(), ctx.shareUrl());
  let pd: { x: number; y: number } | null = null;
  life.on(ctx.cv!, "pointerdown", (e) => {
    pd = { x: e.clientX, y: e.clientY };
  });
  life.on(ctx.cv!, "click", (e) => {
    if (!pd) return;
    const dx = e.clientX - pd.x,
      dy = e.clientY - pd.y;
    pd = null;
    if (dx * dx + dy * dy > 100) return;
    const b = ctx.cv!.getBoundingClientRect(),
      i = ctx.hitRegion(e.clientX - b.left, e.clientY - b.top);
    if (i >= 0) ctx.openRegion(i);
  });
  life.on(ctx.cv!, "pointercancel", () => {
    pd = null;
  });
  const unlockAudio = () => {
    ctx.SND.init();
    if (ctx.SND.ctx && ctx.SND.ctx.state !== "running")
      ctx.SND.ctx.resume().catch(() => {});
    ctx.MUSIC.init();
    if (ctx.MUSIC.on) ctx.MUSIC.start();
  };
  for (const t of ["pointerdown", "pointerup", "click"] as const)
    life.on(document, t, unlockAudio);
  life.on(document, "keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") unlockAudio();
  });
  life.on(document, "keydown", (e) => {
    const T = ctx.TREE;
    const target = e.target instanceof HTMLElement ? e.target : null;
    const activeDialog = target?.closest('[role="dialog"]');
    if (
      T.open &&
      $("#eventModal").hidden &&
      (activeDialog?.id === "treeModal" || activeDialog?.id === "tcard")
    ) {
      if (e.key === "Escape") {
        if (T.card) ctx.closeTreeCard();
        else ctx.closeTree();
        return;
      }
      if (
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        !T.card &&
        !T.list &&
        !(e.target as HTMLElement).matches("select,input,textarea")
      ) {
        T.target = ctx.treeNearest(
          (Math.round(T.a / (Math.PI / 2)) * Math.PI) / 2 +
            ((e.key === "ArrowLeft" ? 1 : -1) * Math.PI) / 2,
        );
        T.hold = performance.now() + 6000;
        return;
      }
    }
    if (e.key === "Escape") {
      if (target?.closest("#codexModal")) ctx.closeCodex();
      else if (target?.closest("#regionModal")) ctx.closeRegion();
      else if (target?.closest("#menuModal")) closeMenu();
      else if (ctx.ui.sheetOpen && innerWidth < 900) ctx.closeSheet();
    }
    if (
      e.key === " " &&
      ctx.ui.mode === "play" &&
      !ctx.ui.modal &&
      !T.open &&
      !(e.target as HTMLElement).closest<HTMLElement>(
        "button,a,input,select,textarea,[role=button]",
      )
    ) {
      e.preventDefault();
      ctx.state.paused = !ctx.state.paused;
    }
  });
  let lastF = performance.now(),
    acc = 0;
  life.on(document, "visibilitychange", () => {
    if (document.hidden) ctx.save();
    else lastF = performance.now();
  });
  life.on(window, "pagehide", ctx.save);
  life.every(() => {
    if (ctx.state.started && !ctx.state.ended) ctx.save();
  }, 5000);
  life.observe($("#mapwrap"), () => {
    ctx.resizeMap();
    ctx.placeToasts();
  });
  life.on(window, "scroll", ctx.placeToasts, true);
  life.on(window, "resize", () => {
    if (innerWidth >= 900 && !ctx.ui.sheetOpen && ctx.ui.mode !== "intro")
      ctx.openSheet(ctx.ui.tab || "world");
  });
  const setAppHeight = () => {
    const h = Math.round(window.visualViewport?.height || innerHeight);
    if (h > 0) $("#app").style.height = h + "px";
  };
  life.on(window, "resize", setAppHeight);
  life.on(window, "orientationchange", () => life.later(setAppHeight, 60));
  if (window.visualViewport)
    life.on(window.visualViewport, "resize", setAppHeight);
  ctx.resizeMap();
  setAppHeight();
  if (innerWidth >= 900) {
    ctx.ui.tab = "world";
    ctx.ui.sheetOpen = true;
  }
  const frame = (now: number) => {
    const rdt = Math.min((now - lastF) / 1000, 1);
    lastF = now;
    ctx.state.up += rdt;
    acc += rdt;
    while (acc >= ctx.TUNING.step) {
      acc -= ctx.TUNING.step;
      if (ctx.state.ended || ctx.state.paused || ctx.ui.modal) continue;
      ctx.tick(ctx.TUNING.step * (ctx.state.started ? ctx.state.speed : 1));
      if (ctx.state.started && ctx.ui.mode === "play" && !ctx.state.ended) {
        ctx.ui.briefClock += ctx.TUNING.step;
        if (ctx.briefDue()) ctx.openBriefing();
      }
    }
    if (now - ctx.ui.lastUi > 100) {
      ctx.ui.lastUi = now;
      ctx.artDirection();
      if (ctx.ui.intUntil && now > ctx.ui.intUntil) {
        ctx.ui.intUntil = 0;
        $("#ticker").className = "ticker";
        $("#tkLive").textContent = "Live";
        ctx.ui.tkT = 0;
      }
      if (
        ctx.state.started &&
        !ctx.state.ended &&
        !ctx.ui.intUntil &&
        now - ctx.ui.tkT > 7000
      ) {
        ctx.ui.tkT = now;
        const el = $("#tkText"),
          t = ctx.tickerText();
        if (t !== ctx.ui.tkLast) {
          el.style.opacity = "0";
          life.later(() => {
            el.textContent = t;
            el.style.opacity = "1";
          }, 300);
          ctx.ui.tkLast = t;
          ctx.ui.wire = (ctx.ui.wire || 0) + 1;
          $("#tkWire").innerHTML =
            "WIRE " +
            String(ctx.ui.wire).padStart(4, "0") +
            "<i> · T+" +
            ctx.fmtT(ctx.state.t) +
            "</i>";
        }
        $("#ticker").classList.toggle(
          "hot",
          ctx.state.alarm >= 70 || ctx.state.phase === 2,
        );
      }
    }
    if (now - ctx.ui.lastMap > 50) {
      ctx.ui.lastMap = now;
      ctx.drawMap(now);
    }
    if (ctx.TREE.open) ctx.treeFrame(now);
    life.raf(frame);
  };
  if (ctx.MUSIC.on) ctx.MUSIC.init();
  life.raf(frame);
  // on* properties belong only to imperative host descendants; Vue never binds them.
  const dispose = (ctx.disposeRuntime = () => {
    if (life.disposed) return;
    ctx.save();
    ctx.endReset();
    ctx.closeTreeCard(true);
    life.dispose();
    for (const host of [
      "#treeModal",
      "#eventModal",
      "#codexModal",
      "#menuModal",
      "#endModal",
    ]) {
      const root = $(host);
      if (!root) continue;
      for (const el of [root, ...root.querySelectorAll<HTMLElement>("*")])
        for (const key of ["onclick", "onchange", "onkeydown"] as const)
          el[key] = null;
    }
    ctx.TREE.nodes.forEach((n) => n.el.remove());
    ctx.TREE.nodes = [];
    ctx.TREE.edges = [];
    ctx.TREE.open = false;
    ctx.eventPresentation = null;
    ctx.pulses = [];
    ctx.drones.length = 0;
    ctx.cv = ctx.cx = null;
    ctx.$ = () => {
      throw new Error("Runtime has been disposed");
    };
    ctx.$$ = () => [];
    for (const n of ["--ai", "--ai2", "--ai-dim", "--line", "--line2"])
      document.documentElement.style.removeProperty(n);
    delete document.body.dataset.phase;
    delete document.body.dataset.build;
  });
  ctx.eventPresentation = previous?.event ?? null;
  if (ctx.state.ended) {
    ctx.showEnd(false);
    if (previous?.revealed) ctx.endReveal();
    if (previous?.more) {
      $("#endNextRow").hidden = true;
      $("#endMore").hidden = false;
    }
  } else {
    if (previous?.tree) {
      ctx.TREE.a = previous.tree.a;
      ctx.TREE.list = previous.tree.list;
      ctx.TREE.listTrack = previous.tree.track;
      ctx.openTree(previous.tree.track);
      if (previous.tree.card) ctx.openTreeCard(previous.tree.card);
    }
    ctx.restoreEventPresentation();
  }
  // Reconcile focus only after F03 has rebuilt the active presentation.
  installModalFocus(life, previousFocus);
  return dispose;
}
