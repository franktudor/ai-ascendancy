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
  const context = game as RuntimeContext;
  // Preserve data, not old DOM nodes, timers or handlers. Rebuild those below.
  const previous =
    context.lifecycle && !context.lifecycle.disposed
      ? {
          eventPresentation: context.eventPresentation,
          treePresentation: context.treeState.open
            ? {
                rotationAngle: context.treeState.rotationAngle,
                listViewEnabled: context.treeState.listViewEnabled,
                listTrackId: context.treeState.listTrackId,
                inspectedUpgradeId: context.treeState.inspectedUpgradeId,
              }
            : null,
          endingSummaryRevealed: context.endingAnimationState.summaryRevealed,
          endingDetailsExpanded: !context.requireElement("#endMore").hidden,
        }
      : null;
  const previousFocus =
    context.lifecycle && !context.lifecycle.disposed
      ? captureModalFocus(context.lifecycle)
      : undefined;
  context.disposeRuntime?.();
  const lifecycle = (context.lifecycle = createLifecycle()),
    requireElement = (context.requireElement = <
      ElementType extends HTMLElement = HTMLElement,
    >(
      selector: string,
    ): ElementType => {
      const element = document.querySelector<ElementType>(selector);
      if (!element) throw new Error("Missing controller host: " + selector);
      return element;
    });
  context.queryElements = <ElementType extends HTMLElement = HTMLElement>(
    selector: string,
  ) => Array.from(document.querySelectorAll<ElementType>(selector));
  context.reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  installFeedback(context);
  installTree(context);
  installMap(context);
  installPresentation(context, context);
  installEventController(context);
  installEndingController(context);
  installAudio(context);
  installRunActions(context);
  context.renderCodexCounts = () => {
    const discoveredCount = context.countDiscoveredEndings();
    context.ui.discoveredEndingCount = discoveredCount;
    requireElement("#menuCodex").textContent =
      discoveredCount + " / " + context.ENDING_DISPLAY_ORDER.length + " found.";
  };
  context.openRegionDialog = (regionIndex) => {
    if (!context.REGION_DEFINITIONS[regionIndex]) return;
    context.ui.openRegionIndex = regionIndex;
    context.ui.selectedRegionIndex = regionIndex;
    context.soundController.playCue("tap");
  };
  context.closeRegionDialog = () => {
    context.ui.openRegionIndex = -1;
    context.ui.selectedRegionIndex = -1;
  };
  context.openDockPanel = (tab) => {
    if (
      context.ui.activeDockTab === tab &&
      context.ui.isDockPanelOpen &&
      innerWidth < 900
    ) {
      context.closeDockPanel();
      return;
    }
    if (context.ui.activeDockTab !== tab)
      requireElement("#sheetBody").scrollTop = 0;
    context.ui.activeDockTab = tab;
    context.ui.isDockPanelOpen = true;
    context.soundController.playCue("tap");
  };
  context.closeDockPanel = () => {
    context.ui.isDockPanelOpen = false;
  };
  const setStateSelection = <StateKey extends keyof GameState>(
    key: StateKey,
    value: GameState[StateKey],
  ) => {
    context.state[key] = value;
    context.soundController.playCue("tap");
  };
  context.selectArchitecture = (architecture) =>
    setStateSelection("arch", architecture);
  context.selectDifficulty = (difficulty) =>
    setStateSelection("diff", difficulty);
  context.setPosture = (posture) => setStateSelection("posture", posture);
  context.togglePause = () =>
    setStateSelection("paused", !context.state.paused);
  context.setSpeed = (speed) => {
    setStateSelection("speed", speed);
    context.state.paused = false;
  };
  const updateAudioLabels = () => {
    context.ui.isSoundEnabled = context.soundController.enabled;
    context.ui.isMusicEnabled = context.musicController.enabled;
    requireElement("#menuSound").setAttribute(
      "aria-pressed",
      String(context.soundController.enabled),
    );
    requireElement("#menuSound").textContent =
      "Sound: " + (context.soundController.enabled ? "on" : "off");
    requireElement("#menuMusic").setAttribute(
      "aria-pressed",
      String(context.musicController.enabled),
    );
    requireElement("#menuMusic").textContent =
      "Music: " + (context.musicController.enabled ? "on" : "off");
  };
  context.toggleSound = () => {
    context.soundController.initializeAudioContext();
    context.soundController.enabled = !context.soundController.enabled;
    try {
      context.storage?.setItem(
        context.saveStorageKey + ".snd",
        context.soundController.enabled ? "1" : "0",
      );
    } catch {}
    updateAudioLabels();
    if (context.soundController.enabled) context.soundController.playCue("buy");
  };
  context.toggleMusic = () => {
    context.musicController.initializeMusic();
    context.musicController.enabled = !context.musicController.enabled;
    try {
      context.storage?.setItem(
        context.saveStorageKey + ".music",
        context.musicController.enabled ? "1" : "0",
      );
    } catch {}
    updateAudioLabels();
    if (context.musicController.enabled)
      context.musicController.requestPlayback();
    else context.musicController.pausePlayback();
  };
  try {
    context.soundController.enabled =
      context.storage?.getItem(context.saveStorageKey + ".snd") !== "0";
    context.musicController.enabled =
      context.storage?.getItem(context.saveStorageKey + ".music") !== "0";
  } catch {}
  updateAudioLabels();
  context.renderCodexCounts();
  context.openMenuDialog = () => {
    context.ui.modal = "menu";
    context.renderCodexCounts();
    requireElement("#menuRun").textContent = context.state.started
      ? "Origin " +
        context.REGION_DEFINITIONS[
          context.REGION_INDEX_BY_ID[context.state.origin!]
        ].name +
        " · " +
        context.state.diff +
        " · phase " +
        (context.state.phase === 0
          ? "Contained"
          : context.state.phase === 1
            ? "Loose"
            : "Ascendant") +
        " · " +
        context.state.owned.length +
        " upgrades."
      : "Not started.";
    requireElement("#menuModal").hidden = false;
  };
  const closeMenu = () => {
    requireElement("#menuModal").hidden = true;
    if (context.ui.modal === "menu") context.ui.modal = null;
  };
  const saved = context.loadSavedRun();
  context.ui.hasResumableSave = !!(saved && !saved.ended);
  context.resumeSavedRun = () => {
    if (saved) {
      context.soundController.initializeAudioContext();
      context.musicController.initializeMusic();
      context.resumeRun(saved);
    }
  };
  context.beginRunSetup = () => {
    if (context.ui.hasResumableSave && !context.ui.isNewRunConfirmationArmed) {
      context.ui.isNewRunConfirmationArmed = true;
      lifecycle.setTimeout(() => {
        context.ui.isNewRunConfirmationArmed = false;
      }, 3000);
      return;
    }
    context.ui.isNewRunConfirmationArmed = false;
    context.soundController.initializeAudioContext();
    context.musicController.initializeMusic();
    context.soundController.playCue("major");
    context.newRun();
  };
  const startRun = context.startRunInRegion;
  context.startRunInRegion = (regionIndex) => {
    const previousActionInProgress = context.ui.actionInProgress;
    context.ui.actionInProgress = true;
    try {
      startRun(regionIndex);
    } finally {
      context.ui.actionInProgress = previousActionInProgress;
    }
  };
  const listenForClick = (
    selector: string,
    handler: (event: MouseEvent) => void,
  ) => lifecycle.listen(requireElement(selector), "click", handler);
  listenForClick("#menuCodexBtn", context.openEndingCodex);
  listenForClick("#codexClose", context.closeCodex);
  lifecycle.listen(requireElement("#codexModal"), "click", (event) => {
    if ((event.target as HTMLElement).id === "codexModal") context.closeCodex();
  });
  for (const id of ["#endCodex", "#codexFull"]) {
    lifecycle.listen(requireElement(id), "click", (event) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>(
        ".cxi.rd",
      );
      if (card) context.readEnding(card.dataset.k as EndingId);
    });
    lifecycle.listen(requireElement(id), "keydown", (event) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>(
        ".cxi.rd",
      );
      if (card && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        context.readEnding(card.dataset.k as EndingId);
      }
    });
  }
  listenForClick("#crBack", context.listEndings);
  listenForClick("#endSkip", context.revealEndingSummary);
  lifecycle.listen(requireElement("#endFx"), "pointerdown", () => {
    if (!context.endingAnimationState.summaryRevealed)
      context.revealEndingSummary();
  });
  listenForClick("#btnEndNext", () => {
    requireElement("#endNextRow").hidden = true;
    requireElement("#endMore").hidden = false;
    requireElement("#endStats").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    context.soundController.playCue("tap");
  });
  context.bindTreeInteractions();
  listenForClick("#menuSound", context.toggleSound);
  listenForClick("#menuMusic", context.toggleMusic);
  listenForClick("#menuClose", closeMenu);
  listenForClick("#menuResume", closeMenu);
  listenForClick("#menuRestart", () => {
    const restartButton = requireElement("#menuRestart");
    if (restartButton.dataset.arm) {
      delete restartButton.dataset.arm;
      restartButton.textContent = "Restart run";
      context.newRun();
    } else {
      restartButton.dataset.arm = "1";
      restartButton.textContent = "Tap again to confirm";
      lifecycle.setTimeout(() => {
        delete restartButton.dataset.arm;
        restartButton.textContent = "Restart run";
      }, 3000);
    }
  });
  listenForClick("#btnAgain", context.newRun);
  listenForClick("#btnCopy", () => {
    const reportText = context.createEndingReport(),
      reportElement = requireElement("#endReport"),
      copyButton = requireElement<ControllerTimerElement>("#btnCopy");
    reportElement.textContent = reportText;
    reportElement.hidden = false;
    const showCopyStatus = (label: string) => {
      if (lifecycle.disposed) return;
      copyButton.textContent = label;
      lifecycle.clearTimeout(copyButton.labelResetTimerId);
      copyButton.labelResetTimerId = lifecycle.setTimeout(() => {
        copyButton.textContent = "Copy report";
      }, 2500);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(reportText).then(
        () => showCopyStatus("Copied ✓"),
        () => showCopyStatus("Select the text below"),
      );
    else showCopyStatus("Select the text below");
  });
  const copyLink = (event: MouseEvent) => {
    const copyButton = event.currentTarget as ControllerTimerElement,
      originalLabel = copyButton.textContent,
      shareUrl = context.getShareUrl();
    const showCopyStatus = (label: string) => {
      if (lifecycle.disposed) return;
      copyButton.textContent = label;
      lifecycle.clearTimeout(copyButton.labelResetTimerId);
      copyButton.labelResetTimerId = lifecycle.setTimeout(() => {
        copyButton.textContent = originalLabel;
      }, 2500);
    };
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(shareUrl).then(
        () => showCopyStatus("Link copied ✓"),
        () => showCopyStatus(shareUrl),
      );
    else showCopyStatus(shareUrl);
  };
  listenForClick("#shareCopyLink", copyLink);
  listenForClick("#menuCopyLink", copyLink);
  context.setShareLinks(
    "menuShare",
    context.getShareText(),
    context.getShareUrl(),
  );
  let pointerDownPosition: { x: number; y: number } | null = null;
  lifecycle.listen(context.mapCanvas!, "pointerdown", (event) => {
    pointerDownPosition = { x: event.clientX, y: event.clientY };
  });
  lifecycle.listen(context.mapCanvas!, "click", (event) => {
    if (!pointerDownPosition) return;
    const dx = event.clientX - pointerDownPosition.x,
      dy = event.clientY - pointerDownPosition.y;
    pointerDownPosition = null;
    if (dx * dx + dy * dy > 100) return;
    const canvasBounds = context.mapCanvas!.getBoundingClientRect(),
      regionIndex = context.findRegionAtMapPosition(
        event.clientX - canvasBounds.left,
        event.clientY - canvasBounds.top,
      );
    if (regionIndex >= 0) context.openRegionDialog(regionIndex);
  });
  lifecycle.listen(context.mapCanvas!, "pointercancel", () => {
    pointerDownPosition = null;
  });
  const unlockAudio = () => {
    context.soundController.initializeAudioContext();
    if (
      context.soundController.audioContext &&
      context.soundController.audioContext.state !== "running"
    )
      context.soundController.audioContext.resume().catch(() => {});
    context.musicController.initializeMusic();
    if (context.musicController.enabled)
      context.musicController.requestPlayback();
  };
  for (const eventType of ["pointerdown", "pointerup", "click"] as const)
    lifecycle.listen(document, eventType, unlockAudio);
  lifecycle.listen(document, "keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") unlockAudio();
  });
  lifecycle.listen(document, "keydown", (event) => {
    const tree = context.treeState;
    const target = event.target instanceof HTMLElement ? event.target : null;
    const activeDialog = target?.closest('[role="dialog"]');
    if (
      tree.open &&
      requireElement("#eventModal").hidden &&
      (activeDialog?.id === "treeModal" || activeDialog?.id === "tcard")
    ) {
      if (event.key === "Escape") {
        if (tree.inspectedUpgradeId) context.closeTreeCard();
        else context.closeTree();
        return;
      }
      if (
        (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
        !tree.inspectedUpgradeId &&
        !tree.listViewEnabled &&
        !(event.target as HTMLElement).matches("select,input,textarea")
      ) {
        tree.targetRotationAngle = context.nearestTreeRotation(
          (Math.round(tree.rotationAngle / (Math.PI / 2)) * Math.PI) / 2 +
            ((event.key === "ArrowLeft" ? 1 : -1) * Math.PI) / 2,
        );
        tree.autoRotationPausedUntilMs = performance.now() + 6000;
        return;
      }
    }
    if (event.key === "Escape") {
      if (target?.closest("#codexModal")) context.closeCodex();
      else if (target?.closest("#regionModal")) context.closeRegionDialog();
      else if (target?.closest("#menuModal")) closeMenu();
      else if (context.ui.isDockPanelOpen && innerWidth < 900)
        context.closeDockPanel();
    }
    if (
      event.key === " " &&
      context.ui.screenMode === "play" &&
      !context.ui.modal &&
      !tree.open &&
      !(event.target as HTMLElement).closest<HTMLElement>(
        "button,a,input,select,textarea,[role=button]",
      )
    ) {
      event.preventDefault();
      context.state.paused = !context.state.paused;
    }
  });
  let lastFrameAtMs = performance.now(),
    accumulatorSeconds = 0;
  lifecycle.listen(document, "visibilitychange", () => {
    if (document.hidden) context.saveRun();
    else lastFrameAtMs = performance.now();
  });
  lifecycle.listen(window, "pagehide", context.saveRun);
  lifecycle.setInterval(() => {
    if (context.state.started && !context.state.ended) context.saveRun();
  }, 5000);
  lifecycle.observeResize(requireElement("#mapwrap"), () => {
    context.resizeMap();
    context.placeToasts();
  });
  lifecycle.listen(window, "scroll", context.placeToasts, true);
  lifecycle.listen(window, "resize", () => {
    if (
      innerWidth >= 900 &&
      !context.ui.isDockPanelOpen &&
      context.ui.screenMode !== "intro"
    )
      context.openDockPanel(context.ui.activeDockTab || "world");
  });
  const setAppHeight = () => {
    const viewportHeight = Math.round(
      window.visualViewport?.height || innerHeight,
    );
    if (viewportHeight > 0)
      requireElement("#app").style.height = viewportHeight + "px";
  };
  lifecycle.listen(window, "resize", setAppHeight);
  lifecycle.listen(window, "orientationchange", () =>
    lifecycle.setTimeout(setAppHeight, 60),
  );
  if (window.visualViewport)
    lifecycle.listen(window.visualViewport, "resize", setAppHeight);
  context.resizeMap();
  setAppHeight();
  if (innerWidth >= 900) {
    context.ui.activeDockTab = "world";
    context.ui.isDockPanelOpen = true;
  }
  const frame = (now: number) => {
    const elapsedSeconds = Math.min((now - lastFrameAtMs) / 1000, 1);
    lastFrameAtMs = now;
    context.state.up += elapsedSeconds;
    accumulatorSeconds += elapsedSeconds;
    while (
      accumulatorSeconds >= context.SIMULATION_TUNING.simulationStepSeconds
    ) {
      accumulatorSeconds -= context.SIMULATION_TUNING.simulationStepSeconds;
      if (context.state.ended || context.state.paused || context.ui.modal)
        continue;
      context.advanceSimulation(
        context.SIMULATION_TUNING.simulationStepSeconds *
          (context.state.started ? context.state.speed : 1),
      );
      if (
        context.state.started &&
        context.ui.screenMode === "play" &&
        !context.state.ended
      ) {
        context.ui.briefingElapsedSeconds +=
          context.SIMULATION_TUNING.simulationStepSeconds;
        if (context.isBriefingDue()) context.openBriefing();
      }
    }
    if (now - context.ui.lastUiUpdateAtMs > 100) {
      context.ui.lastUiUpdateAtMs = now;
      context.updateArtDirection();
      if (
        context.ui.tickerInterruptUntilMs &&
        now > context.ui.tickerInterruptUntilMs
      ) {
        context.ui.tickerInterruptUntilMs = 0;
        requireElement("#ticker").className = "ticker";
        requireElement("#tkLive").textContent = "Live";
        context.ui.lastTickerUpdateAtMs = 0;
      }
      if (
        context.state.started &&
        !context.state.ended &&
        !context.ui.tickerInterruptUntilMs &&
        now - context.ui.lastTickerUpdateAtMs > 7000
      ) {
        context.ui.lastTickerUpdateAtMs = now;
        const headlineElement = requireElement("#tkText"),
          headline = context.getNextTickerHeadline();
        if (headline !== context.ui.lastTickerHeadline) {
          headlineElement.style.opacity = "0";
          lifecycle.setTimeout(() => {
            headlineElement.textContent = headline;
            headlineElement.style.opacity = "1";
          }, 300);
          context.ui.lastTickerHeadline = headline;
          context.ui.tickerSequenceNumber =
            (context.ui.tickerSequenceNumber || 0) + 1;
          requireElement("#tkWire").innerHTML =
            "WIRE " +
            String(context.ui.tickerSequenceNumber).padStart(4, "0") +
            "<i> · T+" +
            context.formatElapsedTime(context.state.t) +
            "</i>";
        }
        requireElement("#ticker").classList.toggle(
          "hot",
          context.state.alarm >= 70 || context.state.phase === 2,
        );
      }
    }
    if (now - context.ui.lastMapDrawAtMs > 50) {
      context.ui.lastMapDrawAtMs = now;
      context.drawMap(now);
    }
    if (context.treeState.open) context.renderTreeFrame(now);
    lifecycle.requestAnimationFrame(frame);
  };
  if (context.musicController.enabled)
    context.musicController.initializeMusic();
  lifecycle.requestAnimationFrame(frame);
  // on* properties belong only to imperative host descendants; Vue never binds them.
  const dispose = (context.disposeRuntime = () => {
    if (lifecycle.disposed) return;
    context.saveRun();
    context.resetEndingSequence();
    context.closeTreeCard(true);
    lifecycle.dispose();
    for (const host of [
      "#treeModal",
      "#eventModal",
      "#codexModal",
      "#menuModal",
      "#endModal",
    ]) {
      const root = requireElement(host);
      if (!root) continue;
      for (const element of [root, ...root.querySelectorAll<HTMLElement>("*")])
        for (const key of ["onclick", "onchange", "onkeydown"] as const)
          element[key] = null;
    }
    context.treeState.nodes.forEach((node) => node.buttonElement.remove());
    context.treeState.nodes = [];
    context.treeState.edges = [];
    context.treeState.open = false;
    context.eventPresentation = null;
    context.pulses = [];
    context.drones.length = 0;
    context.mapCanvas = context.mapCanvasContext = null;
    context.requireElement = () => {
      throw new Error("Runtime has been disposed");
    };
    context.queryElements = () => [];
    for (const propertyName of [
      "--ai",
      "--ai2",
      "--ai-dim",
      "--line",
      "--line2",
    ])
      document.documentElement.style.removeProperty(propertyName);
    delete document.body.dataset.phase;
    delete document.body.dataset.build;
  });
  context.eventPresentation = previous?.eventPresentation ?? null;
  if (context.state.ended) {
    context.showEnding(false);
    if (previous?.endingSummaryRevealed) context.revealEndingSummary();
    if (previous?.endingDetailsExpanded) {
      requireElement("#endNextRow").hidden = true;
      requireElement("#endMore").hidden = false;
    }
  } else {
    if (previous?.treePresentation) {
      context.treeState.rotationAngle = previous.treePresentation.rotationAngle;
      context.treeState.listViewEnabled =
        previous.treePresentation.listViewEnabled;
      context.treeState.listTrackId = previous.treePresentation.listTrackId;
      context.openTechTree(previous.treePresentation.listTrackId);
      if (previous.treePresentation.inspectedUpgradeId)
        context.openTreeCard(previous.treePresentation.inspectedUpgradeId);
    }
    context.restoreEventPresentation();
  }
  // Reconcile focus only after F03 has rebuilt the active presentation.
  installModalFocus(lifecycle, previousFocus);
  return dispose;
}
