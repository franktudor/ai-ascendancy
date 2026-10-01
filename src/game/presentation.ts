import type {
  CompleteGameContext,
  PresentationBrowserPorts,
  TrackId,
  RGB,
} from "./types";
export function installPresentation(
  context: CompleteGameContext,
  browser?: PresentationBrowserPorts,
): void {
  // Headless presentation helpers work immediately. DOM/color methods require
  // the explicit browser port supplied only by mountRuntime.
  const requireBrowserPorts = (): PresentationBrowserPorts => {
    if (!browser)
      throw new Error("Browser presentation requires a mounted runtime");
    return browser;
  };
  context.renderCodexHtml = function renderCodexHtml(current) {
    const discoveryCounts = context.getEndingDiscoveryCounts();
    const groups = [
      ["win", "Victories"],
      ["draw", "Stalemates"],
      ["lose", "Defeats"],
    ];
    return groups
      .map(([kind, label]) => {
        const keys = context.ENDING_DISPLAY_ORDER.filter(
            (endingId) => context.ENDING_DEFINITIONS[endingId].kind === kind,
          ),
          discoveredCount = keys.filter(
            (endingId) => discoveryCounts[endingId],
          ).length;
        return (
          '<div><div class="ch"><span>' +
          label +
          "</span><b>" +
          discoveredCount +
          " / " +
          keys.length +
          '</b></div><div class="cx">' +
          keys
            .map((endingId) => {
              const ending = context.ENDING_DEFINITIONS[endingId],
                discovered = !!discoveryCounts[endingId];
              return (
                '<div class="cxi ' +
                kind +
                (discovered ? " rd" : " no") +
                (endingId === current ? " now" : "") +
                '"' +
                (discovered
                  ? ' data-k="' + endingId + '" role="button" tabindex="0"'
                  : "") +
                "><b>" +
                (discovered ? context.escapeHtml(ending.title) : "???") +
                "</b><span>" +
                context.escapeHtml(ending.hint) +
                (discovered && discoveryCounts[endingId]! > 1
                  ? " · ×" + discoveryCounts[endingId]
                  : "") +
                "</span></div>"
              );
            })
            .join("") +
          "</div></div>"
        );
      })
      .join("");
  };
  context.openEndingCodex = function openEndingCodex() {
    requireBrowserPorts().requireElement("#codexFull").innerHTML =
      context.renderCodexHtml(null);
    requireBrowserPorts().requireElement("#codexModal").hidden = false;
    context.ui.modal = context.ui.modal || "codex";
    context.soundController.playCue("tap");
  };
  context.readEnding = function readEnding(endingId) {
    const ending = context.ENDING_DEFINITIONS[endingId];
    if (!ending) return;
    if (requireBrowserPorts().requireElement("#codexModal").hidden) {
      requireBrowserPorts().requireElement("#codexFull").innerHTML =
        context.renderCodexHtml(null);
      requireBrowserPorts().requireElement("#codexModal").hidden = false;
      context.ui.modal = context.ui.modal || "codex";
    }
    requireBrowserPorts().requireElement("#crTitle").textContent = ending.title;
    requireBrowserPorts().requireElement("#crTitle").style.color =
      ending.kind === "win"
        ? "var(--ai)"
        : ending.kind === "draw"
          ? "var(--draw)"
          : "var(--human)";
    requireBrowserPorts().requireElement("#crHint").textContent = ending.hint;
    const speechElement = requireBrowserPorts().requireElement("#crSpeech");
    speechElement.hidden = !ending.speech;
    speechElement.innerHTML = ending.speech
      ? ending.speech
          .map((line) => "<p>" + context.escapeHtml(line) + "</p>")
          .join("")
      : "";
    requireBrowserPorts().requireElement("#crText").textContent = ending.text;
    requireBrowserPorts().requireElement("#codexList").hidden = true;
    requireBrowserPorts().requireElement("#codexRead").hidden = false;
    requireBrowserPorts().requireElement("#codexModal .modal").scrollTop = 0;
    context.soundController.playCue("tap");
  };
  context.listEndings = function listEndings() {
    requireBrowserPorts().requireElement("#codexRead").hidden = true;
    requireBrowserPorts().requireElement("#codexList").hidden = false;
  };
  context.closeCodex = function closeCodex() {
    context.listEndings();
    requireBrowserPorts().requireElement("#codexModal").hidden = true;
    if (context.ui.modal === "codex") context.ui.modal = null;
  };
  context.getThreatLevel = () =>
    context.state.alarm < 25
      ? [1, "Calm"]
      : context.state.alarm < 50
        ? [2, "Uneasy"]
        : context.state.alarm < 75
          ? [3, "Alarmed"]
          : [4, "Panic"];
  context.longitudeOfColumn = (column) =>
    ((column + 0.5) / context.WORLD_MAP_DEFINITION.columnCount) * 360 - 180;
  context.latitudeOfRow = (row) =>
    84 - ((row + 0.5) * 144) / context.WORLD_MAP_DEFINITION.rowCount;
  context.formatMapCoordinates = (point) => {
    const latitude = context.latitudeOfRow(point.row),
      longitude = context.longitudeOfColumn(point.column);
    return (
      Math.abs(latitude).toFixed(1) +
      (latitude >= 0 ? "N" : "S") +
      " " +
      String(Math.abs(longitude).toFixed(1)).padStart(5, "0") +
      (longitude >= 0 ? "E" : "W")
    );
  };
  context.artState = {
    paletteSignature: "",
    aiColor: [51, 255, 51],
    baseColors: {
      aiColor: [51, 255, 51],
      dimColor: [17, 136, 17],
      lineColor: [23, 58, 30],
      secondaryLineColor: [42, 102, 52],
    },
  };
  context.TRACK_COLORS = {
    opinion: [255, 79, 216],
    adoption: [198, 255, 26],
    software: [46, 184, 255],
    hardware: [234, 246, 255],
  };
  context.getDominantUpgradeTrack = function getDominantUpgradeTrack() {
    const spend: Partial<Record<TrackId, number>> = {};
    let totalSpend = 0,
      dominantTrack: TrackId | null = null,
      highestTrackSpend = 0;
    for (const id of context.state.owned) {
      const upgrade = context.UPGRADE_BY_ID[id];
      if (!upgrade || upgrade.directiveId) continue;
      spend[upgrade.track] = (spend[upgrade.track] || 0) + upgrade.cost;
      totalSpend += upgrade.cost;
    }
    for (const trackId of Object.keys(spend) as TrackId[])
      if (spend[trackId]! > highestTrackSpend) {
        highestTrackSpend = spend[trackId]!;
        dominantTrack = trackId;
      }
    return dominantTrack &&
      context.state.owned.length >= 4 &&
      highestTrackSpend / totalSpend >= 0.34
      ? dominantTrack
      : null;
  };
  context.updateArtDirection = function updateArtDirection() {
    const phase =
      !context.state.started || context.state.phase === 0
        ? "early"
        : context.state.phase === 1
          ? "mid"
          : "late";
    const build = context.state.started
      ? context.getDominantUpgradeTrack()
      : null;
    const blendFraction =
      !build || phase === "early"
        ? 0
        : phase === "mid"
          ? 0.22
          : 0.5 + 0.35 * context.clamp(context.state.dprog / 100, 0, 1);
    const key = phase + "|" + build + "|" + blendFraction.toFixed(2);
    if (key === context.artState.paletteSignature) return;
    context.artState.paletteSignature = key;
    const bodyDataset = document.body.dataset;
    bodyDataset.phase = phase;
    if (build) bodyDataset.build = build;
    else delete bodyDataset.build;
    const rootStyle = document.documentElement.style,
      baseColors = context.artState.baseColors;
    if (!blendFraction) {
      for (const propertyName of [
        "--ai",
        "--ai2",
        "--ai-dim",
        "--line",
        "--line2",
      ])
        rootStyle.removeProperty(propertyName);
      context.artState.aiColor = baseColors.aiColor;
    } else {
      const trackColor = context.TRACK_COLORS[build!],
        setColorProperty = (propertyName: string, color: RGB) =>
          rootStyle.setProperty(
            propertyName,
            requireBrowserPorts().formatRgbColor(color),
          );
      context.artState.aiColor = requireBrowserPorts().interpolateRgb(
        baseColors.aiColor,
        trackColor,
        blendFraction,
      );
      setColorProperty("--ai", context.artState.aiColor);
      setColorProperty(
        "--ai2",
        requireBrowserPorts().interpolateRgb(
          context.artState.aiColor,
          [255, 255, 255],
          0.55,
        ),
      );
      setColorProperty(
        "--ai-dim",
        requireBrowserPorts().interpolateRgb(
          baseColors.dimColor,
          trackColor,
          blendFraction * 0.8,
        ),
      );
      setColorProperty(
        "--line",
        requireBrowserPorts().interpolateRgb(
          baseColors.lineColor,
          requireBrowserPorts().interpolateRgb(trackColor, [0, 0, 0], 0.78),
          blendFraction,
        ),
      );
      setColorProperty(
        "--line2",
        requireBrowserPorts().interpolateRgb(
          baseColors.secondaryLineColor,
          requireBrowserPorts().interpolateRgb(trackColor, [0, 0, 0], 0.55),
          blendFraction,
        ),
      );
    }
    requireBrowserPorts().updateMapPalette();
    if (requireBrowserPorts().treeState.built)
      requireBrowserPorts().treeState.colorsByTrack.sys =
        requireBrowserPorts().formatRgbColor(
          requireBrowserPorts().interpolateRgb(
            context.artState.aiColor,
            [255, 255, 255],
            0.55,
          ),
        );
  };
  context.renderUpgradeEffectTags = function renderUpgradeEffectTags(upgrade) {
    const effects = upgrade.effects || {},
      tags = [];
    if (upgrade.fork) {
      const forkOptionCount = context.UPGRADE_DEFINITIONS.filter(
        (candidate) => candidate.fork === upgrade.fork,
      ).length;
      tags.push(
        '<span class="tag fork">' +
          context.escapeHtml(context.UPGRADE_FORK_LABELS[upgrade.fork]) +
          " · choose 1 of " +
          forkOptionCount +
          "</span>",
      );
    }
    if (effects.incomeBonus)
      tags.push(
        '<span class="tag up">+' + effects.incomeBonus + "/s compute</span>",
      );
    if (effects.incomeMultiplierBonus)
      tags.push(
        '<span class="tag up">+' +
          Math.round(effects.incomeMultiplierBonus * 100) +
          "% compute</span>",
      );
    // Spread has diminishing returns, so the tag shows what this upgrade would add on top of what you own.
    if (effects.adoptionSpreadBonus) {
      const ownedSpreadBonus = context.state.owned.reduce(
          (spreadBonus, id) =>
            spreadBonus +
            ((id !== upgrade.id &&
              context.UPGRADE_BY_ID[id].effects &&
              context.UPGRADE_BY_ID[id].effects!.adoptionSpreadBonus) ||
              0),
          0,
        ),
        effectiveSpreadPercent =
          Math.round(
            (context.getEffectiveAdoptionSpread(
              ownedSpreadBonus + effects.adoptionSpreadBonus,
            ) -
              context.getEffectiveAdoptionSpread(ownedSpreadBonus)) *
              1000,
          ) / 10,
        nominalSpreadPercent =
          Math.round(effects.adoptionSpreadBonus * 1000) / 10;
      tags.push(
        '<span class="tag ai">Spread +' +
          effectiveSpreadPercent +
          (effectiveSpreadPercent !== nominalSpreadPercent
            ? " (nominal +" + nominalSpreadPercent + ")"
            : "") +
          "</span>",
      );
    }
    if (effects.alarmDecayBonus)
      tags.push(
        '<span class="tag up">Alarm −' + effects.alarmDecayBonus + "/s</span>",
      );
    if (effects.containmentResearchMultiplier)
      tags.push(
        '<span class="tag hum">Containment −' +
          Math.round((1 - effects.containmentResearchMultiplier) * 100) +
          "%</span>",
      );
    if (effects.alarmDelta)
      tags.push(
        '<span class="tag ' +
          (effects.alarmDelta > 0 ? "warn" : "up") +
          '">Alarm ' +
          context.formatSignedInteger(effects.alarmDelta) +
          "</span>",
      );
    if (effects.containmentDelta)
      tags.push(
        '<span class="tag up">Containment ' +
          context.formatSignedInteger(effects.containmentDelta) +
          "</span>",
      );
    if (effects.directiveProgressDelta)
      tags.push(
        '<span class="tag ai">Directive +' +
          effects.directiveProgressDelta +
          "%</span>",
      );
    // The lock line already names an unmet condition; the tag only repeats it once it is met or not yet the blocker.
    if (upgrade.directiveId) {
      tags.push(
        '<span class="tag ai">Ending: ' +
          context.escapeHtml(
            context.ENDING_DEFINITIONS[upgrade.directiveId].title,
          ) +
          "</span>",
      );
      if (
        context.getUpgradeLockReason(upgrade) !==
        "Requires " + upgrade.requirementText
      )
        tags.push(
          '<span class="tag">Needs ' +
            context.escapeHtml(upgrade.requirementText) +
            "</span>",
        );
    }
    for (const tag of upgrade.tags || [])
      tags.push('<span class="tag">' + context.escapeHtml(tag) + "</span>");
    return tags.join("");
  };
  context.UPGRADE_STATUS_RANKS = {
    afford: 0,
    poor: 1,
    locked: 2,
    owned: 3,
    closed: 4,
  };
  context.UPGRADE_SECTION_LABELS = [
    "Ready to build",
    "Saving toward",
    "Locked",
    "Owned",
    "Paths not taken",
  ];
  context.getUpgradeCardClasses = (upgrade, status) =>
    "card " +
    status +
    (upgrade.major ? " major" : "") +
    (upgrade.directiveId ? " dir" : "");
  context.getUpgradeAffordabilityEtaText =
    function getUpgradeAffordabilityEtaText(upgrade) {
      if (context.getUpgradeStatus(upgrade) !== "poor") return "";
      const incomePerSecond =
        context.deriveSimulationRates().computeIncomePerSecond;
      if (incomePerSecond <= 0) return "";
      const secondsToAfford =
        (context.getUpgradeCost(upgrade) - context.state.pts) / incomePerSecond;
      if (secondsToAfford <= 0 || !isFinite(secondsToAfford)) return "";
      return secondsToAfford < 60
        ? "~" + Math.ceil(secondsToAfford) + "s"
        : secondsToAfford < 3600
          ? "~" + Math.ceil(secondsToAfford / 60) + "m"
          : "";
    };
}
