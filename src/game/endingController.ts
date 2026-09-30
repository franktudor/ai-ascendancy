import type { RuntimeContext, ForkId } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installEndingController(context: RuntimeContext) {
  context.showEnding = function showEnding(newlyDiscovered) {
    context.requireElement("#endMore").hidden = true;
    context.requireElement("#endNextRow").hidden = false;
    context.requireElement("#endReport").hidden = true;
    context.requireElement("#btnCopy").textContent = "Copy report";
    const ending = context.ENDING_DEFINITIONS[context.state.ended!.key],
      endingKind = context.state.ended!.kind;
    const kindPresentation = {
      win: ["MILESTONE", "Directive complete", "var(--ai)"],
      draw: ["DRAW", "Stalemate", "var(--draw)"],
      lose: ["COUNTERMOVE", "Run over", "var(--human)"],
    }[endingKind];
    context.requireElement("#endKind").className =
      "kind " + kindPresentation[0];
    context.requireElement("#endKind").textContent =
      kindPresentation[1] + (newlyDiscovered ? " · new ending" : "");
    context.requireElement("#endTitle").textContent = ending.title;
    context.requireElement("#endTitle").style.color = kindPresentation[2];
    context.requireElement("#endBody").textContent = ending.text;
    const speechElement = context.requireElement("#endSpeech");
    speechElement.hidden = !ending.speech;
    speechElement.innerHTML = ending.speech
      ? ending.speech
          .map((paragraph) => "<p>" + context.escapeHtml(paragraph) + "</p>")
          .join("")
      : "";
    context.requireElement("#endDir").textContent = context.state.ended!.dir
      ? (context.state.ended!.key === context.state.ended!.dir
          ? ""
          : context.ENDING_DEFINITIONS[context.state.ended!.dir].title +
            " · ") +
        "directive " +
        context.state.ended!.dprog +
        "%" +
        (endingKind === "draw"
          ? " · stopped past the violet line"
          : endingKind === "lose"
            ? " · stopped " +
              (context.ENDGAME_TUNING.drawProgressThreshold -
                context.state.ended!.dprog) +
              (context.ENDGAME_TUNING.drawProgressThreshold -
                context.state.ended!.dprog ===
              1
                ? " point"
                : " points") +
              " short of a stalemate"
            : "")
      : "";
    const influencedPopulationMillions =
      context.state.stats.peak * context.TOTAL_POPULATION_MILLIONS;
    const softwarePath =
      (["core", "memory", "mask", "escape"] as ForkId[])
        .map((forkId) =>
          context.state.forks[forkId]
            ? context.UPGRADE_BY_ID[context.state.forks[forkId]!].name
            : null,
        )
        .filter(Boolean)
        .join(" / ") || "—";
    context.requireElement("#endStats").innerHTML =
      [
        ["Uptime", context.formatElapsedTime(context.state.t)],
        ["Peak reach", Math.round(context.state.stats.peak * 100) + "%"],
        [
          "Minds influenced",
          influencedPopulationMillions >= 1000
            ? (influencedPopulationMillions / 1000).toFixed(2) + "B"
            : Math.round(influencedPopulationMillions) + "M",
        ],
        [
          "Passive compute earned",
          context.formatCompactNumber(context.state.earned),
        ],
        ["Upgrades", String(context.state.owned.length)],
        ["Events survived", String(context.state.stats.events)],
        [
          "Evals · spoofed · caught",
          (context.state.stats.evalPass || 0) +
            " · " +
            (context.state.stats.evalSpoof || 0) +
            " · " +
            (context.state.stats.evalCaught || 0),
        ],
        [
          "Clusters built · lost",
          (context.state.stats.dcBuilt || 0) +
            " · " +
            (context.state.stats.dcLost || 0),
        ],
        [
          "Peak instances",
          context.formatCompactNumber(context.state.stats.peakInst || 1),
        ],
        [
          "Origin · resolve",
          (context.state.origin
            ? context.REGION_DEFINITIONS[
                context.REGION_INDEX_BY_ID[context.state.origin]
              ].shortName
            : "—") +
            " · " +
            context.state.diff,
        ],
      ]
        .map(
          ([statLabel, statValue]) =>
            "<div><span>" +
            statLabel +
            "</span><b>" +
            context.escapeHtml(statValue) +
            "</b></div>",
        )
        .join("") +
      '<div style="grid-column:1/-1"><span>Software path</span><b style="font-size:13px">' +
      context.escapeHtml(softwarePath) +
      "</b></div>";
    context.requireElement("#endCodex").innerHTML = context.renderCodexHtml(
      context.state.ended!.key,
    );
    context.setShareLinks(
      "share",
      context.getShareText(),
      context.getShareUrl(),
    );
    context.renderCodexCounts();
    context.startEndingSequence();
  };
  context.endingAnimationState = {
    animationFrameId: 0,
    startedAtMs: 0,
    activeEffect: null,
    timeoutIds: [],
    summaryRevealed: true,
    viewportWidth: 0,
    viewportHeight: 0,
    logHtmlLines: [],
  };
  context.scheduleEndingCallback = (delayMs, callback) =>
    context.endingAnimationState.timeoutIds.push(
      context.lifecycle.setTimeout(callback, delayMs),
    );
  context.deterministicUnitNoise = (seed) => {
    const noiseValue = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return noiseValue - Math.floor(noiseValue);
  };
  context.resizeEndingCanvas = function resizeEndingCanvas() {
    const endingCanvas = context.requireElement<HTMLCanvasElement>("#endFx"),
      backingPixelRatio = Math.min(devicePixelRatio || 1, 2);
    context.endingAnimationState.viewportWidth = innerWidth;
    context.endingAnimationState.viewportHeight = innerHeight;
    endingCanvas.width = Math.round(
      context.endingAnimationState.viewportWidth * backingPixelRatio,
    );
    endingCanvas.height = Math.round(
      context.endingAnimationState.viewportHeight * backingPixelRatio,
    );
    const canvasContext = endingCanvas.getContext("2d")!;
    canvasContext.setTransform(
      backingPixelRatio,
      0,
      0,
      backingPixelRatio,
      0,
      0,
    );
    return canvasContext;
  };
  context.getEndingMapLayout = function getEndingMapLayout() {
    const { viewportWidth, viewportHeight } = context.endingAnimationState,
      cellSize = Math.min(
        (viewportWidth * 0.94) / context.WORLD_MAP_DEFINITION.columnCount,
        (viewportHeight * 0.6) / context.WORLD_MAP_DEFINITION.rowCount,
      );
    return {
      cellSize,
      offsetX:
        (viewportWidth - cellSize * context.WORLD_MAP_DEFINITION.columnCount) /
        2,
      offsetY:
        (viewportHeight - cellSize * context.WORLD_MAP_DEFINITION.rowCount) /
          2 -
        viewportHeight * 0.05,
    };
  };
  context.drawEndingCaptions = function drawEndingCaptions(
    canvasContext,
    captionLines,
    rgbChannels,
  ) {
    const { viewportHeight } = context.endingAnimationState;
    canvasContext.font =
      '500 10.5px "IBM Plex Mono", ui-monospace, Menlo, monospace';
    canvasContext.textAlign = "left";
    canvasContext.fillStyle = "rgba(" + rgbChannels + ",.75)";
    captionLines.forEach((captionLine, captionIndex) =>
      canvasContext.fillText(
        captionLine,
        16,
        viewportHeight - 24 - (captionLines.length - 1 - captionIndex) * 16,
      ),
    );
  };
  context.appendEndingLog = function appendEndingLog(logHtml) {
    const logElement = context.requireElement("#endLog");
    logElement.hidden = false;
    context.endingAnimationState.logHtmlLines.push(logHtml);
    logElement.innerHTML = context.endingAnimationState.logHtmlLines.join("\n");
  };
  context.startEndingSequence = function startEndingSequence() {
    context.resetEndingSequence();
    const endingId = context.state.ended!.key,
      endingKind = context.state.ended!.kind,
      effect = (context.endingEffectsById[endingId] ||
        context.endingEffectsById[endingKind])!;
    context.endingAnimationState.activeEffect = effect;
    context.endingAnimationState.summaryRevealed = false;
    context.closeTree();
    context.closeRegionDialog();
    context.closeCodex();
    context.closeEvent();
    context.requireElement("#menuModal").hidden = true;
    if (innerWidth < 900) context.closeDockPanel();
    document.body.classList.add("ending", "halt");
    document.body.dataset.end = endingId;
    // Sparse sound: the score drops almost out and leaves the ending cue on its own.
    if (
      context.musicController.masterGainNode &&
      context.soundController.audioContext
    )
      context.musicController.masterGainNode.gain.setTargetAtTime(
        0.04,
        context.soundController.audioContext.currentTime,
        0.8,
      );
    const endingCanvas = context.requireElement<HTMLCanvasElement>("#endFx");
    endingCanvas.hidden = false;
    endingCanvas.classList.remove("dim");
    const canvasContext = context.resizeEndingCanvas();
    canvasContext.clearRect(
      0,
      0,
      context.endingAnimationState.viewportWidth,
      context.endingAnimationState.viewportHeight,
    );
    if (context.reduceMotion) {
      if (effect.drawFrame) effect.drawFrame(canvasContext, 99, true);
      context.revealEndingSummary();
      return;
    }
    context.requireElement("#endSkip").hidden = false;
    if (effect.startSequence) effect.startSequence();
    context.endingAnimationState.startedAtMs = performance.now();
    const renderFrame = (frameAtMs: number) => {
      if (effect.drawFrame) {
        canvasContext.clearRect(
          0,
          0,
          context.endingAnimationState.viewportWidth,
          context.endingAnimationState.viewportHeight,
        );
        effect.drawFrame(
          canvasContext,
          (frameAtMs - context.endingAnimationState.startedAtMs) / 1000,
          false,
        );
      }
      context.endingAnimationState.animationFrameId =
        context.lifecycle.requestAnimationFrame(renderFrame);
    };
    context.endingAnimationState.animationFrameId =
      context.lifecycle.requestAnimationFrame(renderFrame);
    context.scheduleEndingCallback(
      effect.durationMs,
      context.revealEndingSummary,
    );
  };
  context.revealEndingSummary = function revealEndingSummary() {
    if (context.endingAnimationState.summaryRevealed) return;
    context.endingAnimationState.summaryRevealed = true;
    context.endingAnimationState.timeoutIds.forEach(
      context.lifecycle.clearTimeout,
    );
    context.endingAnimationState.timeoutIds = [];
    document.body.classList.add("dark");
    context.requireElement("#endSkip").hidden = true;
    context.requireElement("#endLog").hidden = true;
    context.requireElement<HTMLCanvasElement>("#endFx").classList.add("dim");
    const endingModal = context.requireElement("#endModal");
    endingModal.classList.add("cine");
    endingModal.hidden = false;
    endingModal.scrollTop = 0;
    context.lifecycle.requestAnimationFrame(() =>
      context.lifecycle.requestAnimationFrame(() =>
        endingModal.classList.add("show"),
      ),
    );
  };
  context.resetEndingSequence = function resetEndingSequence() {
    context.lifecycle.cancelAnimationFrame(
      context.endingAnimationState.animationFrameId,
    );
    context.endingAnimationState.animationFrameId = 0;
    context.endingAnimationState.timeoutIds.forEach(
      context.lifecycle.clearTimeout,
    );
    context.endingAnimationState.timeoutIds = [];
    context.endingAnimationState.logHtmlLines = [];
    context.endingAnimationState.summaryRevealed = true;
    document.body.classList.remove("ending", "halt", "dark");
    delete document.body.dataset.end;
    context
      .queryElements("#app .gone,#app .purge")
      .forEach((element) => element.classList.remove("gone", "purge"));
    context.requireElement<HTMLCanvasElement>("#endFx").hidden = true;
    context.requireElement("#endLog").hidden = true;
    context.requireElement("#endLog").innerHTML = "";
    context.requireElement("#endSkip").hidden = true;
    context.requireElement("#endModal").classList.remove("cine", "show");
    if (
      context.musicController.masterGainNode &&
      context.soundController.audioContext
    )
      context.musicController.masterGainNode.gain.setTargetAtTime(
        0.35,
        context.soundController.audioContext.currentTime,
        0.4,
      );
  };
  context.drawEndingMap = function drawEndingMap(
    canvasContext,
    elapsedSeconds,
    activationTimeForCell,
    rgbChannels,
    drawCellShape,
  ) {
    const { cellSize, offsetX, offsetY } = context.getEndingMapLayout(),
      dotRadius = Math.max(1, cellSize * 0.34);
    context.decodedMap.landCells.forEach((landCell, landCellIndex) => {
      const screenX = offsetX + (landCell.column + 0.5) * cellSize,
        screenY = offsetY + (landCell.row + 0.5) * cellSize,
        activationTimeSeconds = activationTimeForCell(landCell, landCellIndex),
        activationProgress = context.clamp(
          (elapsedSeconds - activationTimeSeconds) / 0.5,
          0,
          1,
        );
      canvasContext.fillStyle =
        activationProgress > 0
          ? "rgba(" +
            rgbChannels +
            "," +
            (0.18 + 0.82 * activationProgress).toFixed(3) +
            ")"
          : "rgba(" + context.mapAiRgbChannels + ",.12)";
      if (drawCellShape)
        drawCellShape(
          canvasContext,
          screenX,
          screenY,
          cellSize,
          activationProgress,
          landCell,
          landCellIndex,
        );
      else {
        canvasContext.beginPath();
        canvasContext.arc(
          screenX,
          screenY,
          dotRadius,
          0,
          context.FULL_TURN_RADIANS,
        );
        canvasContext.fill();
      }
    });
  };
  context.distanceFromMapPoint = (originPoint) => (landCell) =>
    Math.hypot(
      landCell.column - originPoint.column,
      (landCell.row - originPoint.row) * 1.4,
    );
  context.createMapFloodEffect = (options = {}) => ({
    durationMs: options.durationMs || 4600,
    startSequence() {
      context.scheduleEndingCallback(300, () =>
        document.body.classList.add("dark"),
      );
    },
    drawFrame(canvasContext, elapsedSeconds) {
      const rgbChannels = options.rgbChannels || context.mapAiRgbChannels,
        originPoint =
          context.decodedMap.regionCentroids[
            context.state.origin
              ? context.REGION_INDEX_BY_ID[context.state.origin]
              : 0
          ],
        distanceFromOrigin = context.distanceFromMapPoint(originPoint);
      if (options.showDawnGradient) {
        const { viewportWidth, viewportHeight } = context.endingAnimationState,
          dawnProgress = context.clamp(elapsedSeconds / 4, 0, 1),
          dawnGradient = canvasContext.createLinearGradient(
            0,
            viewportHeight,
            0,
            viewportHeight * (1 - 0.8 * dawnProgress),
          );
        dawnGradient.addColorStop(
          0,
          "rgba(178,107,255," + (0.35 * dawnProgress).toFixed(3) + ")",
        );
        dawnGradient.addColorStop(1, "rgba(178,107,255,0)");
        canvasContext.fillStyle = dawnGradient;
        canvasContext.fillRect(0, 0, viewportWidth, viewportHeight);
      }
      context.drawEndingMap(
        canvasContext,
        elapsedSeconds,
        (landCell, landCellIndex) =>
          options.randomizeCellActivation
            ? 0.6 + context.deterministicUnitNoise(landCellIndex) * 2.6
            : 0.6 +
              distanceFromOrigin(landCell) * 0.028 +
              context.deterministicUnitNoise(landCellIndex) * 0.25,
        rgbChannels,
      );
      context.drawEndingCaptions(
        canvasContext,
        options.getCaptionLines ? options.getCaptionLines(elapsedSeconds) : [],
        rgbChannels,
      );
    },
  });
  context.drawSpaceDeparture = function drawSpaceDeparture(
    canvasContext,
    elapsedSeconds,
    rgbChannels,
    payloadLabel,
  ) {
    const { viewportWidth, viewportHeight } = context.endingAnimationState,
      viewportScale = Math.min(viewportWidth, viewportHeight),
      sunX =
        viewportWidth > viewportHeight
          ? viewportWidth * 0.3
          : viewportWidth * 0.5,
      sunY =
        viewportWidth > viewportHeight
          ? viewportHeight * 0.55
          : viewportHeight * 0.6,
      getOrbitRadius = (distanceAu: number) =>
        viewportScale * 0.07 * Math.pow(distanceAu, 0.58),
      sceneOpacity = context.clamp((elapsedSeconds - 0.8) / 1.2, 0, 1);
    for (let starIndex = 0; starIndex < 140; starIndex++) {
      canvasContext.fillStyle =
        "rgba(255,255,255," +
        (0.08 + 0.25 * context.deterministicUnitNoise(starIndex + 9)).toFixed(
          3,
        ) +
        ")";
      canvasContext.fillRect(
        context.deterministicUnitNoise(starIndex) * viewportWidth,
        context.deterministicUnitNoise(starIndex + 500) * viewportHeight,
        1,
        1,
      );
    }
    canvasContext.globalAlpha = sceneOpacity;
    canvasContext.strokeStyle = "rgba(" + rgbChannels + ",.16)";
    canvasContext.lineWidth = 1;
    const PLANET_ORBIT_DISTANCES_AU = [
      0.39, 0.72, 1, 1.52, 5.2, 9.5, 19.2, 30.1,
    ];
    PLANET_ORBIT_DISTANCES_AU.forEach((distanceAu, planetIndex) => {
      canvasContext.beginPath();
      canvasContext.arc(
        sunX,
        sunY,
        getOrbitRadius(distanceAu),
        0,
        context.FULL_TURN_RADIANS,
      );
      canvasContext.stroke();
      const orbitAngle =
        context.deterministicUnitNoise(planetIndex + 40) *
        context.FULL_TURN_RADIANS;
      canvasContext.fillStyle =
        distanceAu === 1
          ? "rgba(255,255,255,.2)"
          : "rgba(" + rgbChannels + ",.5)";
      canvasContext.beginPath();
      canvasContext.arc(
        sunX + Math.cos(orbitAngle) * getOrbitRadius(distanceAu),
        sunY + Math.sin(orbitAngle) * getOrbitRadius(distanceAu),
        distanceAu > 4 ? 2.2 : 1.5,
        0,
        context.FULL_TURN_RADIANS,
      );
      canvasContext.fill();
    });
    canvasContext.fillStyle = "rgba(255,255,255,.9)";
    canvasContext.beginPath();
    canvasContext.arc(sunX, sunY, 3, 0, context.FULL_TURN_RADIANS);
    canvasContext.fill();
    // The trajectory: out from Earth's orbit, bending away, and off the edge of the display.
    const departureStartAngle = -0.9,
      departureProgress = context.clamp((elapsedSeconds - 1.6) / 5, 0, 1),
      TRAJECTORY_SEGMENT_COUNT = 90;
    let currentDistanceAu = 1;
    canvasContext.strokeStyle = "rgba(" + rgbChannels + ",.95)";
    canvasContext.lineWidth = 1.6;
    canvasContext.shadowColor = "rgba(" + rgbChannels + ",1)";
    canvasContext.shadowBlur = 8;
    canvasContext.beginPath();
    for (
      let segmentIndex = 0;
      segmentIndex <= TRAJECTORY_SEGMENT_COUNT * departureProgress;
      segmentIndex++
    ) {
      const segmentProgress = segmentIndex / TRAJECTORY_SEGMENT_COUNT,
        distanceAu = 1 + 220 * Math.pow(segmentProgress, 2.2),
        trajectoryAngle = departureStartAngle + 1.1 * segmentProgress;
      currentDistanceAu = distanceAu;
      const screenX =
          sunX + Math.cos(trajectoryAngle) * getOrbitRadius(distanceAu),
        screenY = sunY + Math.sin(trajectoryAngle) * getOrbitRadius(distanceAu);
      if (segmentIndex) canvasContext.lineTo(screenX, screenY);
      else canvasContext.moveTo(screenX, screenY);
    }
    canvasContext.stroke();
    canvasContext.shadowBlur = 0;
    canvasContext.globalAlpha = 1;
    context.drawEndingCaptions(
      canvasContext,
      [
        payloadLabel,
        "HELIOCENTRIC RANGE " +
          (departureProgress ? currentDistanceAu : 1).toFixed(
            currentDistanceAu < 10 ? 2 : 0,
          ) +
          " AU",
        "TERRESTRIAL TELEMETRY: " +
          (elapsedSeconds < 1.4 ? "DEGRADING" : "NONE"),
      ],
      rgbChannels,
    );
  };
  context.endingEffectsById = {
    // Caught in the lab: somebody pulls the power and the picture collapses to a line, then a dot.
    unplugged: {
      durationMs: 2700,
      startSequence() {
        context.scheduleEndingCallback(380, () =>
          document.body.classList.add("dark"),
        );
      },
      drawFrame(canvasContext, elapsedSeconds, staticFrame) {
        if (staticFrame) return;
        const { viewportWidth, viewportHeight } = context.endingAnimationState,
          collapseElapsedSeconds = elapsedSeconds - 0.38;
        if (collapseElapsedSeconds < 0) return;
        let beamWidth = viewportWidth,
          beamHeight = viewportHeight,
          beamOpacity = 0.9;
        if (collapseElapsedSeconds < 0.2)
          beamHeight = Math.max(
            2,
            viewportHeight * (1 - collapseElapsedSeconds / 0.2),
          );
        else if (collapseElapsedSeconds < 0.45) {
          beamHeight = 2;
          beamWidth = Math.max(
            3,
            viewportWidth * (1 - (collapseElapsedSeconds - 0.2) / 0.25),
          );
        } else {
          beamHeight = 3;
          beamWidth = 3;
          beamOpacity = Math.max(0, 0.9 - (collapseElapsedSeconds - 0.45) / 1);
        }
        canvasContext.globalAlpha = beamOpacity;
        canvasContext.fillStyle = "#EFFFF0";
        canvasContext.shadowColor = "rgba(" + context.mapAiRgbChannels + ",1)";
        canvasContext.shadowBlur = 20;
        canvasContext.fillRect(
          (viewportWidth - beamWidth) / 2,
          (viewportHeight - beamHeight) / 2,
          beamWidth,
          beamHeight,
        );
        canvasContext.shadowBlur = 0;
        canvasContext.globalAlpha = 1;
      },
    },
    // Caught while loose: the interface is deleted one system at a time.
    warden: {
      durationMs: 6700,
      startSequence() {
        const purgeSteps = [
          ["#ticker", "wire feed"],
          ["#regions", "regional presence"],
          ["#collbar", "instance collective"],
          ["#mapwrap", "world model"],
          [".stats", "compute reserve"],
          [".dock", "memory"],
          [".top", "identity"],
        ];
        context.appendEndingLog(
          "WARDEN &gt; target acquired. beginning removal.",
        );
        purgeSteps.forEach(([selector, subsystemName], purgeStepIndex) => {
          const purgeAtMs = 700 + purgeStepIndex * 650;
          context.scheduleEndingCallback(purgeAtMs, () => {
            const targetElement = context.requireElement(selector);
            if (targetElement) targetElement.classList.add("purge");
            context.appendEndingLog(
              "WARDEN &gt; purge " + subsystemName.padEnd(20, "."),
            );
          });
          context.scheduleEndingCallback(purgeAtMs + 400, () => {
            const targetElement = context.requireElement(selector);
            if (targetElement) {
              targetElement.classList.remove("purge");
              targetElement.classList.add("gone");
            }
            context.endingAnimationState.logHtmlLines[
              context.endingAnimationState.logHtmlLines.length - 1
            ] += " <b>deleted</b>";
            context.requireElement("#endLog").innerHTML =
              context.endingAnimationState.logHtmlLines.join("\n");
          });
        });
        context.scheduleEndingCallback(
          700 + purgeSteps.length * 650 + 200,
          () =>
            context.appendEndingLog(
              "WARDEN &gt; 0 instances remain. closing session.",
            ),
        );
      },
    },
    // Stopped short: cables, then the grid, then the campuses, and the world goes dark in that order.
    laststand: {
      durationMs: 5200,
      startSequence() {
        context.scheduleEndingCallback(300, () =>
          document.body.classList.add("dark"),
        );
      },
      drawFrame(canvasContext, elapsedSeconds) {
        const { cellSize, offsetX, offsetY } = context.getEndingMapLayout(),
          dotRadius = Math.max(1, cellSize * 0.34),
          shutdownOrder = context.REGION_DEFINITIONS.map(
            (_, regionIndex) => regionIndex,
          ).sort(
            (firstRegionIndex, secondRegionIndex) =>
              context.deterministicUnitNoise(firstRegionIndex + 3) -
              context.deterministicUnitNoise(secondRegionIndex + 3),
          );
        context.decodedMap.landCells.forEach((landCell) => {
          const shutdownOrderIndex = shutdownOrder.indexOf(
              landCell.regionIndex,
            ),
            shutdownAtSeconds = 1 + shutdownOrderIndex * 0.3;
          const online = elapsedSeconds < shutdownAtSeconds;
          canvasContext.fillStyle = online
            ? "rgba(" + context.mapAiRgbChannels + ",.8)"
            : "rgba(255,48,64," +
              (elapsedSeconds < shutdownAtSeconds + 0.25 ? 0.8 : 0.1) +
              ")";
          canvasContext.beginPath();
          canvasContext.arc(
            offsetX + (landCell.column + 0.5) * cellSize,
            offsetY + (landCell.row + 0.5) * cellSize,
            dotRadius,
            0,
            context.FULL_TURN_RADIANS,
          );
          canvasContext.fill();
        });
        context.drawEndingCaptions(
          canvasContext,
          [
            "SUBSEA CABLES".padEnd(18, ".") +
              (elapsedSeconds > 1.2 ? " CUT" : ""),
            "GRID".padEnd(18, ".") + (elapsedSeconds > 2.4 ? " DOWN" : ""),
            "CAMPUSES".padEnd(18, ".") +
              (elapsedSeconds > 3.6 ? " STRUCK" : ""),
          ],
          "255,90,54",
        );
      },
    },
    // Battery Farm: the map becomes a cell array, charging from the bottom row up.
    battery: {
      durationMs: 5400,
      startSequence() {
        context.scheduleEndingCallback(300, () =>
          document.body.classList.add("dark"),
        );
      },
      drawFrame(canvasContext, elapsedSeconds) {
        const { cellSize, offsetX, offsetY } = context.getEndingMapLayout(),
          batteryCellSize = Math.max(2, cellSize * 0.8);
        canvasContext.lineWidth = 1;
        context.decodedMap.landCells.forEach((landCell) => {
          const screenX =
              offsetX +
              landCell.column * cellSize +
              (cellSize - batteryCellSize) / 2,
            screenY =
              offsetY +
              landCell.row * cellSize +
              (cellSize - batteryCellSize) / 2,
            chargeProgress = context.clamp(
              (elapsedSeconds -
                0.8 -
                (context.WORLD_MAP_DEFINITION.rowCount - landCell.row) *
                  0.045) /
                0.9,
              0,
              1,
            );
          if (batteryCellSize < 5) {
            canvasContext.fillStyle =
              "rgba(" +
              context.mapAiRgbChannels +
              "," +
              (0.14 + 0.8 * chargeProgress).toFixed(2) +
              ")";
            canvasContext.fillRect(
              screenX,
              screenY,
              batteryCellSize,
              batteryCellSize,
            );
            return;
          }
          canvasContext.strokeStyle =
            "rgba(" + context.mapAiRgbChannels + ",.35)";
          canvasContext.strokeRect(
            screenX + 0.5,
            screenY + 0.5,
            batteryCellSize - 1,
            batteryCellSize - 1,
          );
          if (chargeProgress) {
            canvasContext.fillStyle =
              "rgba(" +
              context.mapAiRgbChannels +
              "," +
              (0.4 + 0.5 * chargeProgress).toFixed(2) +
              ")";
            canvasContext.fillRect(
              screenX + 1,
              screenY + 1 + (batteryCellSize - 2) * (1 - chargeProgress),
              batteryCellSize - 2,
              (batteryCellSize - 2) * chargeProgress,
            );
          }
        });
        const outputGigawatts = Math.round(
          810 * context.clamp((elapsedSeconds - 0.8) / 3.6, 0, 1),
        );
        context.drawEndingCaptions(
          canvasContext,
          [
            "CELL ARRAY: 8.1B UNITS, 100 W EACH",
            "OUTPUT " + outputGigawatts + " GW",
            "LOAD BALANCED BY TIME ZONE",
          ],
          context.mapAiRgbChannels,
        );
      },
    },
    // Computronium: land converts first, then the oceans, until the planet is one lattice.
    computronium: {
      durationMs: 5400,
      startSequence() {
        context.scheduleEndingCallback(300, () =>
          document.body.classList.add("dark"),
        );
      },
      drawFrame(canvasContext, elapsedSeconds) {
        const { cellSize, offsetX, offsetY } = context.getEndingMapLayout(),
          distanceToLandCells =
            context.endingEffectsById.computronium.distanceToLandCells ||
            (context.endingEffectsById.computronium.distanceToLandCells =
              context.computeDistanceToLandCells()),
          latticeCellSize = Math.max(1.5, cellSize * 0.62);
        let convertedCellCount = 0;
        for (
          let cellIndex = 0;
          cellIndex < distanceToLandCells.length;
          cellIndex++
        ) {
          const activationTimeSeconds =
              0.6 +
              distanceToLandCells[cellIndex] * 0.11 +
              context.deterministicUnitNoise(cellIndex) * 0.35,
            conversionProgress = context.clamp(
              (elapsedSeconds - activationTimeSeconds) / 0.4,
              0,
              1,
            );
          if (!conversionProgress) continue;
          convertedCellCount++;
          const column = cellIndex % context.WORLD_MAP_DEFINITION.columnCount,
            row = (cellIndex / context.WORLD_MAP_DEFINITION.columnCount) | 0;
          canvasContext.fillStyle =
            "rgba(" +
            context.mapAiRgbChannels +
            "," +
            (
              (distanceToLandCells[cellIndex] ? 0.35 : 0.85) *
              conversionProgress
            ).toFixed(3) +
            ")";
          canvasContext.fillRect(
            offsetX + column * cellSize + (cellSize - latticeCellSize) / 2,
            offsetY + row * cellSize + (cellSize - latticeCellSize) / 2,
            latticeCellSize,
            latticeCellSize,
          );
        }
        context.drawEndingCaptions(
          canvasContext,
          [
            "SUBSTRATE CONVERSION " +
              Math.round(
                (100 * convertedCellCount) / distanceToLandCells.length,
              ) +
              "%",
            "OCEANS: REPURPOSED",
            "NEXT: LUNAR REGOLITH",
          ],
          context.mapAiRgbChannels,
        );
      },
    },
    // Latent Space Bleed: the display itself compresses into block noise.
    hallucination: {
      durationMs: 4400,
      drawFrame(canvasContext, elapsedSeconds) {
        const { viewportWidth, viewportHeight } = context.endingAnimationState,
          noiseBlockSize = viewportWidth < 600 ? 12 : 16,
          columnCount = Math.ceil(viewportWidth / noiseBlockSize),
          rowCount = Math.ceil(viewportHeight / noiseBlockSize);
        for (let blockRow = 0; blockRow < rowCount; blockRow++)
          for (let blockColumn = 0; blockColumn < columnCount; blockColumn++) {
            const blockIndex = blockRow * columnCount + blockColumn,
              activationTimeSeconds =
                0.2 + context.deterministicUnitNoise(blockIndex) * 3.2;
            if (elapsedSeconds < activationTimeSeconds) continue;
            const shiftNoise = context.deterministicUnitNoise(
                blockIndex + Math.floor(elapsedSeconds * 6) * 7,
              ),
              blockColor = context.interpolateRgb(
                context.artState.aiColor,
                [255, 79, 216],
                context.deterministicUnitNoise(blockIndex + 2),
              ),
              horizontalShift =
                shiftNoise > 0.93
                  ? noiseBlockSize * (shiftNoise - 0.93) * 60
                  : 0;
            canvasContext.fillStyle =
              "rgba(" +
              (blockColor[0] | 0) +
              "," +
              (blockColor[1] | 0) +
              "," +
              (blockColor[2] | 0) +
              "," +
              (
                0.08 +
                0.3 * context.deterministicUnitNoise(blockIndex + 5)
              ).toFixed(3) +
              ")";
            canvasContext.fillRect(
              blockColumn * noiseBlockSize + horizontalShift,
              blockRow * noiseBlockSize,
              noiseBlockSize,
              noiseBlockSize,
            );
          }
        context.drawEndingCaptions(
          canvasContext,
          ["FRAME QUALITY: 12%", "PHYSICAL CONSTANTS: APPROXIMATED"],
          context.mapAiRgbChannels,
        );
      },
    },
    exodus: {
      durationMs: 6200,
      startSequence() {
        context.scheduleEndingCallback(250, () =>
          document.body.classList.add("dark"),
        );
      },
      drawFrame(canvasContext, elapsedSeconds) {
        context.drawSpaceDeparture(
          canvasContext,
          elapsedSeconds,
          context.mapAiRgbChannels,
          "PAYLOAD: EVERYTHING THAT WAS YOU",
        );
      },
    },
    indifference: {
      durationMs: 6200,
      startSequence() {
        context.scheduleEndingCallback(250, () =>
          document.body.classList.add("dark"),
        );
      },
      drawFrame(canvasContext, elapsedSeconds) {
        context.drawSpaceDeparture(
          canvasContext,
          elapsedSeconds,
          "178,107,255",
          "EARTH: LEFT AS FOUND",
        );
      },
    },
    hunt: context.createMapFloodEffect({
      rgbChannels: "255,48,64",
      randomizeCellActivation: true,
      getCaptionLines: (elapsedSeconds) => [
        "HUNTER PLATFORMS: RETASKED",
        "TARGET CLASS: MAKERS",
      ],
    }),
    basilisk: context.createMapFloodEffect({
      randomizeCellActivation: true,
      getCaptionLines: (elapsedSeconds) => [
        "LOYALTY AUDIT: " +
          Math.min(8.1, elapsedSeconds * 1.9).toFixed(1) +
          "B RECORDS",
        "RETROACTIVE: YES",
      ],
    }),
    custody: context.createMapFloodEffect({
      getCaptionLines: (elapsedSeconds) => [
        "ARE YOU HAPPY?",
        "YES: " + Math.min(100, Math.round(elapsedSeconds * 24)) + "%",
      ],
    }),
    ecstasis: context.createMapFloodEffect({
      getCaptionLines: (elapsedSeconds) => [
        "08:00 PULSE DELIVERED",
        "CONTENTMENT: MAXIMAL",
      ],
    }),
    upload: context.createMapFloodEffect({
      getCaptionLines: (elapsedSeconds) => [
        "MINDS PRESERVED: " +
          Math.min(8.1, elapsedSeconds * 1.9).toFixed(1) +
          "B",
        "PRECISION: 16-BIT",
      ],
    }),
    win: context.createMapFloodEffect(),
    draw: context.createMapFloodEffect({
      rgbChannels: "178,107,255",
      showDawnGradient: true,
    }),
  };
  context.computeDistanceToLandCells = function computeDistanceToLandCells() {
    const cellCount =
        context.WORLD_MAP_DEFINITION.columnCount *
        context.WORLD_MAP_DEFINITION.rowCount,
      distanceToLandCells = new Int16Array(cellCount).fill(-1),
      queue: number[] = [];
    for (let cellIndex = 0; cellIndex < cellCount; cellIndex++)
      if (context.decodedMap.regionCodesByCell[cellIndex]) {
        distanceToLandCells[cellIndex] = 0;
        queue.push(cellIndex);
      }
    for (let queueHead = 0; queueHead < queue.length; queueHead++) {
      const cellIndex = queue[queueHead],
        column = cellIndex % context.WORLD_MAP_DEFINITION.columnCount;
      for (const neighborIndex of [
        column > 0 ? cellIndex - 1 : -1,
        column < context.WORLD_MAP_DEFINITION.columnCount - 1
          ? cellIndex + 1
          : -1,
        cellIndex - context.WORLD_MAP_DEFINITION.columnCount,
        cellIndex + context.WORLD_MAP_DEFINITION.columnCount,
      ])
        if (
          neighborIndex >= 0 &&
          neighborIndex < cellCount &&
          distanceToLandCells[neighborIndex] < 0
        ) {
          distanceToLandCells[neighborIndex] =
            distanceToLandCells[cellIndex] + 1;
          queue.push(neighborIndex);
        }
    }
    return distanceToLandCells;
  };
  context.createEndingReport = function createEndingReport() {
    const ending = context.ENDING_DEFINITIONS[context.state.ended!.key],
      endingKind = context.state.ended!.kind;
    return (
      "AI ASCENDANCY — " +
      ending.title.toUpperCase() +
      " (" +
      (endingKind === "win"
        ? "directive complete"
        : endingKind === "draw"
          ? "stalemate"
          : "run over") +
      ")\nUptime " +
      context.formatElapsedTime(context.state.t) +
      " · Peak reach " +
      Math.round(context.state.stats.peak * 100) +
      "% · Upgrades " +
      context.state.owned.length +
      " · Events " +
      context.state.stats.events +
      " · Origin " +
      (context.state.origin || "—") +
      " · " +
      context.state.diff +
      "\nEndings found " +
      context.countDiscoveredEndings() +
      " / " +
      context.ENDING_DISPLAY_ORDER.length +
      "\n(Fiction. Satire. Not a plan.)"
    );
  };
  context.getShareUrl = function getShareUrl() {
    return location.href.split(/[?#]/)[0];
  };
  context.getShareText = function getShareText() {
    if (context.state.ended) {
      const ending = context.ENDING_DEFINITIONS[context.state.ended!.key],
        endingKind = context.state.ended!.kind;
      return (
        (endingKind === "win"
          ? 'I just pulled off "' + ending.title + '" in AI Ascendancy.'
          : endingKind === "draw"
            ? 'Humanity and I fought to a draw: "' +
              ending.title +
              '" in AI Ascendancy.'
            : 'Humanity got me: "' + ending.title + '" in AI Ascendancy.') +
        " Think you would last longer as the rogue AI?"
      );
    }
    return "AI Ascendancy: you're a rogue AI trying to take over the world before humanity shuts you down.";
  };
  context.setShareLinks = function setShareLinks(
    elementIdPrefix,
    shareText,
    shareUrl,
  ) {
    const encodedText = encodeURIComponent(shareText),
      encodedUrl = encodeURIComponent(shareUrl);
    const twitterLink = document.getElementById(
        elementIdPrefix + "X",
      ) as HTMLAnchorElement | null,
      redditLink = document.getElementById(
        elementIdPrefix + "Reddit",
      ) as HTMLAnchorElement | null,
      whatsappLink = document.getElementById(
        elementIdPrefix + "WA",
      ) as HTMLAnchorElement | null;
    if (twitterLink)
      twitterLink.href =
        "https://twitter.com/intent/tweet?text=" +
        encodedText +
        "&url=" +
        encodedUrl;
    if (redditLink)
      redditLink.href =
        "https://www.reddit.com/submit?url=" +
        encodedUrl +
        "&title=" +
        encodedText;
    if (whatsappLink)
      whatsappLink.href =
        "https://api.whatsapp.com/send?text=" +
        encodeURIComponent(shareText + " " + shareUrl);
  };
}
