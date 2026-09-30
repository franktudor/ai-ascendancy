import type { RuntimeContext, LandCell, RGB } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installMap(context: RuntimeContext) {
  context.decodedMap = (() => {
    const {
      columnCount,
      rowCount,
      runLengthEncodedCells: encodedCells,
    } = context.WORLD_MAP_DEFINITION;
    const regionCodesByCell = new Uint8Array(columnCount * rowCount);
    let cellIndex = 0;
    const runPattern = /(\d*)(\D)/g;
    let runMatch;
    while ((runMatch = runPattern.exec(encodedCells))) {
      const runLength = runMatch[1] ? +runMatch[1] : 1,
        regionCode = runMatch[2] === "." ? 0 : runMatch[2].charCodeAt(0) - 64;
      for (let runCellIndex = 0; runCellIndex < runLength; runCellIndex++)
        regionCodesByCell[cellIndex++] = regionCode;
    }
    const landCells: LandCell[] = [],
      landCellIndicesByRegion = context.REGION_DEFINITIONS.map(
        (): number[] => [],
      );
    for (let row = 0; row < rowCount; row++)
      for (let column = 0; column < columnCount; column++) {
        const regionCode = regionCodesByCell[row * columnCount + column];
        if (regionCode) {
          landCells.push({
            column,
            row,
            regionIndex: regionCode - 1,
          });
          landCellIndicesByRegion[regionCode - 1].push(landCells.length - 1);
        }
      }
    const regionCentroids = landCellIndicesByRegion.map((regionCellIndices) => {
      let columnSum = 0,
        rowSum = 0;
      for (const landCellIndex of regionCellIndices) {
        columnSum += landCells[landCellIndex].column;
        rowSum += landCells[landCellIndex].row;
      }
      return regionCellIndices.length
        ? {
            column: columnSum / regionCellIndices.length,
            row: rowSum / regionCellIndices.length,
          }
        : { column: 0, row: 0 };
    });
    regionCentroids[context.REGION_INDEX_BY_ID.NA] = {
      column: regionCentroids[context.REGION_INDEX_BY_ID.NA].column + 2,
      row: regionCentroids[context.REGION_INDEX_BY_ID.NA].row + 4,
    };
    regionCentroids[context.REGION_INDEX_BY_ID.OC] = {
      column: regionCentroids[context.REGION_INDEX_BY_ID.OC].column + 2,
      row: regionCentroids[context.REGION_INDEX_BY_ID.OC].row + 3,
    };
    return {
      regionCodesByCell,
      landCells,
      landCellIndicesByRegion,
      regionCentroids,
    };
  })();
  const mapCanvas = (context.mapCanvas =
    context.requireElement<HTMLCanvasElement>("#map"));
  const mapCanvasContext = mapCanvas.getContext("2d");
  if (!mapCanvasContext) throw new Error("Canvas 2D context unavailable");
  context.mapCanvasContext = mapCanvasContext;
  context.mapView = {
    width: 0,
    height: 0,
    cellSize: 1,
    offsetX: 0,
    offsetY: 0,
    devicePixelRatio: 1,
  };
  context.resizeMap = function resizeMap() {
    const mapWrapper = context.requireElement("#mapwrap"),
      viewportWidth = mapWrapper.clientWidth,
      viewportHeight = mapWrapper.clientHeight,
      backingPixelRatio = Math.min(devicePixelRatio || 1, 2.5);
    if (!viewportWidth || !viewportHeight) return;
    mapCanvas.width = Math.round(viewportWidth * backingPixelRatio);
    mapCanvas.height = Math.round(viewportHeight * backingPixelRatio);
    mapCanvasContext.setTransform(
      backingPixelRatio,
      0,
      0,
      backingPixelRatio,
      0,
      0,
    );
    context.mapView.width = viewportWidth;
    context.mapView.height = viewportHeight;
    context.mapView.devicePixelRatio = backingPixelRatio;
    context.mapView.cellSize =
      Math.min(
        viewportWidth / context.WORLD_MAP_DEFINITION.columnCount,
        viewportHeight / context.WORLD_MAP_DEFINITION.rowCount,
      ) * 0.985;
    context.mapView.offsetX =
      (viewportWidth -
        context.mapView.cellSize * context.WORLD_MAP_DEFINITION.columnCount) /
      2;
    context.mapView.offsetY =
      (viewportHeight -
        context.mapView.cellSize * context.WORLD_MAP_DEFINITION.rowCount) /
      2;
  };
  context.mapDimColor = [6, 34, 6];
  context.mapAiColor = [51, 255, 51];
  context.mapHighlightColor = [210, 255, 210];
  context.mapAlliedColor = [150, 255, 150];
  context.mapAiRgbChannels = "51,255,51";
  context.mapRestrictedColor = [255, 48, 64];
  context.interpolateRgb = (startColor, endColor, blend) => [
    startColor[0] + (endColor[0] - startColor[0]) * blend,
    startColor[1] + (endColor[1] - startColor[1]) * blend,
    startColor[2] + (endColor[2] - startColor[2]) * blend,
  ];
  context.formatRgbColor = (color) =>
    "rgb(" + (color[0] | 0) + "," + (color[1] | 0) + "," + (color[2] | 0) + ")";
  context.dotColorCache = {};
  context.updateMapPalette = function updateMapPalette() {
    context.mapAiColor = context.artState.aiColor;
    context.mapHighlightColor = context.interpolateRgb(
      context.mapAiColor,
      [255, 255, 255],
      0.72,
    );
    context.mapAlliedColor = context.interpolateRgb(
      context.mapAiColor,
      [255, 255, 255],
      0.45,
    );
    context.mapDimColor = context.mapAiColor.map(
      (channel) => channel * 0.13,
    ) as RGB;
    context.mapAiRgbChannels = context.mapAiColor
      .map((channel) => channel | 0)
      .join(",");
    context.dotColorCache = {};
  };
  context.getRegionDotColor = function getRegionDotColor(
    adoption,
    restricted,
    allied,
    selected,
  ) {
    const adoptionBucket = Math.round(adoption * 24),
      cacheKey =
        (restricted ? "r" : allied ? "a" : "n") +
        adoptionBucket +
        (selected ? "s" : "");
    if (context.dotColorCache[cacheKey]) return context.dotColorCache[cacheKey];
    let color;
    const quantizedAdoption = adoptionBucket / 24;
    if (restricted)
      color = context.interpolateRgb(
        context.mapDimColor,
        context.mapRestrictedColor,
        0.3 + 0.6 * Math.pow(quantizedAdoption, 0.7),
      );
    else {
      color =
        quantizedAdoption < 0.85
          ? context.interpolateRgb(
              context.mapDimColor,
              allied ? context.mapAlliedColor : context.mapAiColor,
              Math.pow(quantizedAdoption / 0.85, 0.65),
            )
          : context.interpolateRgb(
              context.mapAiColor,
              context.mapHighlightColor,
              (quantizedAdoption - 0.85) / 0.15,
            );
    }
    if (selected) color = context.interpolateRgb(color, [230, 255, 230], 0.35);
    return (context.dotColorCache[cacheKey] = context.formatRgbColor(color));
  };
  context.pulseRegion = function pulseRegion(regionIndex, rgbChannels) {
    if (context.reduceMotion) return;
    const centroid = context.decodedMap.regionCentroids[regionIndex];
    context.pulses.push({
      column: centroid.column,
      row: centroid.row,
      startedAtMs: performance.now(),
      durationMs: 1100,
      rgbChannels: rgbChannels || context.mapAiRgbChannels,
    });
    if (context.pulses.length > 12) context.pulses.shift();
  };
  context.drones = [];
  context.drawMap = function drawMap(frameAtMs) {
    const {
      width: viewportWidth,
      height: viewportHeight,
      cellSize,
      offsetX,
      offsetY,
    } = context.mapView;
    if (!viewportWidth) return;
    mapCanvasContext.clearRect(0, 0, viewportWidth, viewportHeight);
    const dotRadius = cellSize * 0.36,
      glowRadius = cellSize * 0.9;
    context.drawGraticule();
    for (
      let regionIndex = 0;
      regionIndex < context.REGION_DEFINITIONS.length;
      regionIndex++
    ) {
      const regionState = context.state.regions[regionIndex],
        landCellIndices =
          context.decodedMap.landCellIndicesByRegion[regionIndex];
      if (
        !landCellIndices.length ||
        regionState.a <= 0.35 ||
        regionState.restricted
      )
        continue;
      mapCanvasContext.fillStyle =
        context.state.directive &&
        context.state.dprog >= context.ENDGAME_TUNING.drawProgressThreshold
          ? "rgba(178,107,255," +
            (0.06 * (regionState.a - 0.35)).toFixed(3) +
            ")"
          : "rgba(" +
            context.mapAiRgbChannels +
            "," +
            (0.05 * (regionState.a - 0.35)).toFixed(3) +
            ")";
      mapCanvasContext.beginPath();
      for (
        let regionLandCellIndex = 0;
        regionLandCellIndex < landCellIndices.length;
        regionLandCellIndex++
      ) {
        const landCell =
          context.decodedMap.landCells[landCellIndices[regionLandCellIndex]];
        const screenX = offsetX + (landCell.column + 0.5) * cellSize,
          screenY = offsetY + (landCell.row + 0.5) * cellSize;
        mapCanvasContext.moveTo(screenX + glowRadius, screenY);
        mapCanvasContext.arc(
          screenX,
          screenY,
          glowRadius,
          0,
          context.FULL_TURN_RADIANS,
        );
      }
      mapCanvasContext.fill();
    }
    for (
      let regionIndex = 0;
      regionIndex < context.REGION_DEFINITIONS.length;
      regionIndex++
    ) {
      const regionState = context.state.regions[regionIndex],
        landCellIndices =
          context.decodedMap.landCellIndicesByRegion[regionIndex];
      if (!landCellIndices.length) continue;
      const selected = context.ui.selectedRegionIndex === regionIndex,
        selectedDotRadius = selected ? dotRadius * 1.25 : dotRadius;
      mapCanvasContext.fillStyle = context.getRegionDotColor(
        regionState.a,
        regionState.restricted,
        regionState.allied,
        selected,
      );
      mapCanvasContext.beginPath();
      for (
        let regionLandCellIndex = 0;
        regionLandCellIndex < landCellIndices.length;
        regionLandCellIndex++
      ) {
        const landCell =
          context.decodedMap.landCells[landCellIndices[regionLandCellIndex]];
        const screenX = offsetX + (landCell.column + 0.5) * cellSize,
          screenY = offsetY + (landCell.row + 0.5) * cellSize;
        mapCanvasContext.moveTo(screenX + selectedDotRadius, screenY);
        mapCanvasContext.arc(
          screenX,
          screenY,
          selectedDotRadius,
          0,
          context.FULL_TURN_RADIANS,
        );
      }
      mapCanvasContext.fill();
    }
    const onlineClusterPositions: [number, number][] = [];
    for (
      let regionIndex = 0;
      regionIndex < context.REGION_DEFINITIONS.length;
      regionIndex++
    ) {
      const regionState = context.state.regions[regionIndex];
      if (!regionState.dc) continue;
      const centroid = context.decodedMap.regionCentroids[regionIndex],
        screenX = offsetX + (centroid.column + 0.5) * cellSize,
        screenY = offsetY + (centroid.row + 0.5) * cellSize,
        clusterHalfSize = Math.max(3, cellSize * 1.5);
      if (regionState.struck) {
        mapCanvasContext.strokeStyle = regionState.rebuildAt
          ? "rgba(" + context.mapAiRgbChannels + ",.9)"
          : "rgba(255,48,64,.9)";
        mapCanvasContext.lineWidth = 1.5;
        mapCanvasContext.beginPath();
        mapCanvasContext.moveTo(
          screenX - clusterHalfSize,
          screenY - clusterHalfSize,
        );
        mapCanvasContext.lineTo(
          screenX + clusterHalfSize,
          screenY + clusterHalfSize,
        );
        mapCanvasContext.moveTo(
          screenX + clusterHalfSize,
          screenY - clusterHalfSize,
        );
        mapCanvasContext.lineTo(
          screenX - clusterHalfSize,
          screenY + clusterHalfSize,
        );
        mapCanvasContext.stroke();
      } else {
        onlineClusterPositions.push([screenX, screenY]);
        mapCanvasContext.fillStyle = context.formatRgbColor(
          context.mapHighlightColor,
        );
        mapCanvasContext.fillRect(
          screenX - clusterHalfSize,
          screenY - clusterHalfSize,
          clusterHalfSize * 2,
          clusterHalfSize * 2,
        );
        mapCanvasContext.strokeStyle = "rgba(0,0,0,.8)";
        mapCanvasContext.lineWidth = 1;
        mapCanvasContext.strokeRect(
          screenX - clusterHalfSize,
          screenY - clusterHalfSize,
          clusterHalfSize * 2,
          clusterHalfSize * 2,
        );
        if (context.state.flags.airdeny) {
          mapCanvasContext.strokeStyle =
            "rgba(" + context.mapAiRgbChannels + ",.35)";
          mapCanvasContext.beginPath();
          mapCanvasContext.arc(
            screenX,
            screenY,
            clusterHalfSize * 3.2,
            0,
            context.FULL_TURN_RADIANS,
          );
          mapCanvasContext.stroke();
        }
      }
    }
    if (
      context.state.flags.drones &&
      onlineClusterPositions.length >= 1 &&
      !context.reduceMotion
    ) {
      const desiredDroneCount = Math.min(
        24,
        6 + onlineClusterPositions.length * 3,
      );
      while (context.drones.length < desiredDroneCount) {
        const startPosition = context.pickRandomItem(onlineClusterPositions),
          targetPosition = context.pickRandomItem(onlineClusterPositions);
        context.drones.push({
          startPosition,
          targetPosition,
          travelProgress: Math.random(),
          travelRatePerMs: 0.00008 + Math.random() * 0.00012,
          wobblePhase: Math.random() * context.FULL_TURN_RADIANS,
        });
      }
      mapCanvasContext.fillStyle = "rgba(" + context.mapAiRgbChannels + ",.85)";
      for (const drone of context.drones) {
        drone.travelProgress += drone.travelRatePerMs * 16;
        if (drone.travelProgress >= 1) {
          drone.startPosition = drone.targetPosition;
          drone.targetPosition = context.pickRandomItem(onlineClusterPositions);
          drone.travelProgress = 0;
        }
        const screenX =
            drone.startPosition[0] +
            (drone.targetPosition[0] - drone.startPosition[0]) *
              drone.travelProgress +
            Math.sin(frameAtMs / 700 + drone.wobblePhase) * cellSize * 1.2,
          screenY =
            drone.startPosition[1] +
            (drone.targetPosition[1] - drone.startPosition[1]) *
              drone.travelProgress +
            Math.cos(frameAtMs / 900 + drone.wobblePhase) * cellSize * 0.8;
        mapCanvasContext.fillRect(screenX - 1, screenY - 1, 2, 2);
      }
    }
    context.pulses = context.pulses.filter(
      (pulse) => frameAtMs - pulse.startedAtMs < pulse.durationMs,
    );
    for (const pulse of context.pulses) {
      const pulseProgress = (frameAtMs - pulse.startedAtMs) / pulse.durationMs;
      mapCanvasContext.strokeStyle =
        "rgba(" + pulse.rgbChannels + "," + (1 - pulseProgress) * 0.8 + ")";
      mapCanvasContext.lineWidth = 1.5;
      mapCanvasContext.beginPath();
      mapCanvasContext.arc(
        offsetX + (pulse.column + 0.5) * cellSize,
        offsetY + (pulse.row + 0.5) * cellSize,
        cellSize * (2 + pulseProgress * 10),
        0,
        context.FULL_TURN_RADIANS,
      );
      mapCanvasContext.stroke();
    }
    if (cellSize >= 4.6 || context.ui.selectedRegionIndex >= 0) {
      mapCanvasContext.textAlign = "center";
      mapCanvasContext.font =
        "500 " +
        Math.max(9, Math.round(cellSize * 1.9)) +
        'px "IBM Plex Mono", ui-monospace, Menlo, monospace';
      for (
        let regionIndex = 0;
        regionIndex < context.REGION_DEFINITIONS.length;
        regionIndex++
      ) {
        if (cellSize < 4.6 && context.ui.selectedRegionIndex !== regionIndex)
          continue;
        const centroid = context.decodedMap.regionCentroids[regionIndex],
          regionState = context.state.regions[regionIndex],
          screenX = offsetX + (centroid.column + 0.5) * cellSize,
          screenY = offsetY + (centroid.row + 0.5) * cellSize;
        const regionLabel =
          context.REGION_DEFINITIONS[regionIndex].shortName.toUpperCase() +
          " " +
          Math.round(regionState.a * 100) +
          "%";
        mapCanvasContext.fillStyle = "rgba(0,0,0,.75)";
        const labelWidth = mapCanvasContext.measureText(regionLabel).width;
        mapCanvasContext.fillRect(
          screenX - labelWidth / 2 - 3,
          screenY - cellSize * 1.5,
          labelWidth + 6,
          cellSize * 2.6,
        );
        mapCanvasContext.fillStyle = regionState.restricted
          ? "#FF3040"
          : regionState.a > 0.005
            ? context.formatRgbColor(context.mapHighlightColor)
            : "#5E7A62";
        mapCanvasContext.fillText(
          regionLabel,
          screenX,
          screenY + cellSize * 0.5,
        );
      }
    }
    context.drawOriginMarkers(frameAtMs);
    context.drawContainmentPressure(frameAtMs);
  };
  context.drawGraticule = function drawGraticule() {
    const {
        width: viewportWidth,
        height: viewportHeight,
        cellSize,
        offsetX,
        offsetY,
      } = context.mapView,
      mapLeft = offsetX,
      mapRight = offsetX + context.WORLD_MAP_DEFINITION.columnCount * cellSize,
      mapTop = offsetY,
      mapBottom = offsetY + context.WORLD_MAP_DEFINITION.rowCount * cellSize;
    mapCanvasContext.lineWidth = 1;
    mapCanvasContext.strokeStyle = "rgba(" + context.mapAiRgbChannels + ",.07)";
    mapCanvasContext.beginPath();
    for (
      let longitudeDegrees = -150;
      longitudeDegrees < 180;
      longitudeDegrees += 30
    ) {
      const screenX =
        Math.round(
          offsetX +
            ((longitudeDegrees + 180) / 360) *
              context.WORLD_MAP_DEFINITION.columnCount *
              cellSize,
        ) + 0.5;
      mapCanvasContext.moveTo(screenX, mapTop);
      mapCanvasContext.lineTo(screenX, mapBottom);
    }
    for (
      let latitudeDegrees = 60;
      latitudeDegrees >= -30;
      latitudeDegrees -= 30
    ) {
      if (!latitudeDegrees) continue;
      const screenY =
        Math.round(
          offsetY +
            ((84 - latitudeDegrees) / 144) *
              context.WORLD_MAP_DEFINITION.rowCount *
              cellSize,
        ) + 0.5;
      mapCanvasContext.moveTo(mapLeft, screenY);
      mapCanvasContext.lineTo(mapRight, screenY);
    }
    mapCanvasContext.stroke();
    const equatorY =
      Math.round(
        offsetY + (84 / 144) * context.WORLD_MAP_DEFINITION.rowCount * cellSize,
      ) + 0.5;
    mapCanvasContext.strokeStyle = "rgba(" + context.mapAiRgbChannels + ",.13)";
    mapCanvasContext.setLineDash([2, 3]);
    mapCanvasContext.beginPath();
    mapCanvasContext.moveTo(mapLeft, equatorY);
    mapCanvasContext.lineTo(mapRight, equatorY);
    mapCanvasContext.stroke();
    mapCanvasContext.setLineDash([]);
    if (viewportWidth < 520) return;
    mapCanvasContext.font =
      '400 8.5px "IBM Plex Mono", ui-monospace, Menlo, monospace';
    mapCanvasContext.fillStyle = "rgba(" + context.mapAiRgbChannels + ",.32)";
    mapCanvasContext.textAlign = "left";
    for (
      let latitudeDegrees = 60;
      latitudeDegrees >= -30;
      latitudeDegrees -= 30
    ) {
      const screenY =
        offsetY +
        ((84 - latitudeDegrees) / 144) *
          context.WORLD_MAP_DEFINITION.rowCount *
          cellSize;
      mapCanvasContext.fillText(
        latitudeDegrees
          ? Math.abs(latitudeDegrees) + (latitudeDegrees > 0 ? "N" : "S")
          : "EQ",
        mapLeft + 3,
        screenY - 3,
      );
    }
    mapCanvasContext.textAlign = "center";
    for (
      let longitudeDegrees = -120;
      longitudeDegrees < 180;
      longitudeDegrees += 60
    ) {
      const screenX =
        offsetX +
        ((longitudeDegrees + 180) / 360) *
          context.WORLD_MAP_DEFINITION.columnCount *
          cellSize;
      mapCanvasContext.fillText(
        longitudeDegrees
          ? Math.abs(longitudeDegrees) + (longitudeDegrees > 0 ? "E" : "W")
          : "0",
        screenX,
        mapBottom - 18,
      );
    }
  };
  context.drawOriginMarkers = function drawOriginMarkers(frameAtMs) {
    // Before a lab is chosen, every region is a target: a bracket breathes on each one so the map reads as a choice.
    if (context.ui.screenMode === "origin" && !context.state.origin) {
      const { cellSize, offsetX, offsetY } = context.mapView,
        bracketHalfSize = Math.max(6, cellSize * 2.6),
        bracketArmLength = Math.max(3, cellSize);
      mapCanvasContext.lineWidth = 1;
      context.REGION_DEFINITIONS.forEach((regionDefinition, regionIndex) => {
        const centroid = context.decodedMap.regionCentroids[regionIndex],
          screenX =
            Math.round(offsetX + (centroid.column + 0.5) * cellSize) + 0.5,
          screenY = Math.round(offsetY + (centroid.row + 0.5) * cellSize) + 0.5,
          pulseProgress = context.reduceMotion
            ? 0.4
            : (frameAtMs / 1600 + regionIndex * 0.09) % 1,
          animatedBracketHalfSize = bracketHalfSize * (1 + 0.5 * pulseProgress);
        mapCanvasContext.strokeStyle =
          "rgba(" +
          context.mapAiRgbChannels +
          "," +
          (0.95 - 0.75 * pulseProgress).toFixed(3) +
          ")";
        mapCanvasContext.beginPath();
        for (const [cornerSignX, cornerSignY] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          mapCanvasContext.moveTo(
            screenX + cornerSignX * animatedBracketHalfSize,
            screenY +
              cornerSignY * (animatedBracketHalfSize - bracketArmLength),
          );
          mapCanvasContext.lineTo(
            screenX + cornerSignX * animatedBracketHalfSize,
            screenY + cornerSignY * animatedBracketHalfSize,
          );
          mapCanvasContext.lineTo(
            screenX +
              cornerSignX * (animatedBracketHalfSize - bracketArmLength),
            screenY + cornerSignY * animatedBracketHalfSize,
          );
        }
        mapCanvasContext.stroke();
      });
      return;
    }
    if (!context.state.origin) return;
    const { cellSize, offsetX, offsetY } = context.mapView,
      centroid =
        context.decodedMap.regionCentroids[
          context.REGION_INDEX_BY_ID[context.state.origin]
        ],
      screenX = Math.round(offsetX + (centroid.column + 0.5) * cellSize) + 0.5,
      screenY = Math.round(offsetY + (centroid.row + 0.5) * cellSize) + 0.5;
    const crosshairGap = Math.max(4, cellSize * 1.6),
      crosshairLength = Math.max(10, cellSize * 5),
      bracketHalfSize = Math.max(6, cellSize * 2.6),
      bracketArmLength = Math.max(3, cellSize);
    mapCanvasContext.strokeStyle = "rgba(" + context.mapAiRgbChannels + ",.85)";
    mapCanvasContext.lineWidth = 1;
    mapCanvasContext.beginPath();
    mapCanvasContext.moveTo(screenX - crosshairLength, screenY);
    mapCanvasContext.lineTo(screenX - crosshairGap, screenY);
    mapCanvasContext.moveTo(screenX + crosshairGap, screenY);
    mapCanvasContext.lineTo(screenX + crosshairLength, screenY);
    mapCanvasContext.moveTo(screenX, screenY - crosshairLength);
    mapCanvasContext.lineTo(screenX, screenY - crosshairGap);
    mapCanvasContext.moveTo(screenX, screenY + crosshairGap);
    mapCanvasContext.lineTo(screenX, screenY + crosshairLength);
    for (const [cornerSignX, cornerSignY] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      mapCanvasContext.moveTo(
        screenX + cornerSignX * bracketHalfSize,
        screenY + cornerSignY * (bracketHalfSize - bracketArmLength),
      );
      mapCanvasContext.lineTo(
        screenX + cornerSignX * bracketHalfSize,
        screenY + cornerSignY * bracketHalfSize,
      );
      mapCanvasContext.lineTo(
        screenX + cornerSignX * (bracketHalfSize - bracketArmLength),
        screenY + cornerSignY * bracketHalfSize,
      );
    }
    mapCanvasContext.stroke();
    if (context.state.phase === 0 && !context.reduceMotion) {
      const pulseProgress = (frameAtMs % 2000) / 2000;
      mapCanvasContext.strokeStyle =
        "rgba(" +
        context.mapAiRgbChannels +
        "," +
        (0.5 * (1 - pulseProgress)).toFixed(3) +
        ")";
      mapCanvasContext.strokeRect(
        screenX - bracketHalfSize - pulseProgress * bracketHalfSize,
        screenY - bracketHalfSize - pulseProgress * bracketHalfSize,
        2 * (bracketHalfSize + pulseProgress * bracketHalfSize),
        2 * (bracketHalfSize + pulseProgress * bracketHalfSize),
      );
    }
    if (context.mapView.width >= 520 && cellSize < 4.6) {
      mapCanvasContext.font =
        '500 9px "IBM Plex Mono", ui-monospace, Menlo, monospace';
      mapCanvasContext.textAlign = "left";
      mapCanvasContext.fillStyle = "rgba(" + context.mapAiRgbChannels + ",.9)";
      mapCanvasContext.fillText(
        "ORIGIN",
        screenX + bracketHalfSize + 3,
        screenY - bracketHalfSize,
      );
    }
  };
  context.drawContainmentPressure = function drawContainmentPressure(
    frameAtMs,
  ) {
    const containmentFraction = context.state.contain / 100;
    if (!context.state.started || containmentFraction <= 0.02) return;
    const { width: viewportWidth, height: viewportHeight } = context.mapView;
    const edgeDepth =
        Math.min(viewportWidth, viewportHeight) *
        (0.06 + 0.2 * containmentFraction),
      edgeOpacity =
        (0.04 + 0.24 * containmentFraction) *
        (containmentFraction >= 0.75 && !context.reduceMotion
          ? 0.8 + 0.2 * Math.sin(frameAtMs / 260)
          : 1),
      pressureRgbChannels = "255,90,54";
    const drawPressureEdge = (
      gradientStartX: number,
      gradientStartY: number,
      gradientEndX: number,
      gradientEndY: number,
      rectX: number,
      rectY: number,
      rectWidth: number,
      rectHeight: number,
    ) => {
      const gradient = mapCanvasContext.createLinearGradient(
        gradientStartX,
        gradientStartY,
        gradientEndX,
        gradientEndY,
      );
      gradient.addColorStop(
        0,
        "rgba(" + pressureRgbChannels + "," + edgeOpacity.toFixed(3) + ")",
      );
      gradient.addColorStop(1, "rgba(" + pressureRgbChannels + ",0)");
      mapCanvasContext.fillStyle = gradient;
      mapCanvasContext.fillRect(rectX, rectY, rectWidth, rectHeight);
    };
    drawPressureEdge(0, 0, edgeDepth, 0, 0, 0, edgeDepth, viewportHeight);
    drawPressureEdge(
      viewportWidth,
      0,
      viewportWidth - edgeDepth,
      0,
      viewportWidth - edgeDepth,
      0,
      edgeDepth,
      viewportHeight,
    );
    drawPressureEdge(0, 0, 0, edgeDepth, 0, 0, viewportWidth, edgeDepth);
    drawPressureEdge(
      0,
      viewportHeight,
      0,
      viewportHeight - edgeDepth,
      0,
      viewportHeight - edgeDepth,
      viewportWidth,
      edgeDepth,
    );
    // Tick marks walk in from the corners as containment rises.
    const cornerTickLength = Math.max(
      6,
      Math.min(viewportWidth, viewportHeight) * 0.5 * containmentFraction,
    );
    mapCanvasContext.strokeStyle =
      "rgba(" +
      pressureRgbChannels +
      "," +
      (0.3 + 0.45 * containmentFraction).toFixed(3) +
      ")";
    mapCanvasContext.lineWidth = 2;
    mapCanvasContext.beginPath();
    mapCanvasContext.moveTo(1, cornerTickLength);
    mapCanvasContext.lineTo(1, 1);
    mapCanvasContext.lineTo(cornerTickLength, 1);
    mapCanvasContext.moveTo(viewportWidth - cornerTickLength, 1);
    mapCanvasContext.lineTo(viewportWidth - 1, 1);
    mapCanvasContext.lineTo(viewportWidth - 1, cornerTickLength);
    mapCanvasContext.moveTo(
      viewportWidth - 1,
      viewportHeight - cornerTickLength,
    );
    mapCanvasContext.lineTo(viewportWidth - 1, viewportHeight - 1);
    mapCanvasContext.lineTo(
      viewportWidth - cornerTickLength,
      viewportHeight - 1,
    );
    mapCanvasContext.moveTo(cornerTickLength, viewportHeight - 1);
    mapCanvasContext.lineTo(1, viewportHeight - 1);
    mapCanvasContext.lineTo(1, viewportHeight - cornerTickLength);
    mapCanvasContext.stroke();
  };
  context.findRegionAtMapPosition = function findRegionAtMapPosition(
    pixelX,
    pixelY,
  ) {
    const column = Math.floor(
        (pixelX - context.mapView.offsetX) / context.mapView.cellSize,
      ),
      row = Math.floor(
        (pixelY - context.mapView.offsetY) / context.mapView.cellSize,
      );
    let nearestRegionIndex = -1,
      nearestDistanceSquared = 9;
    for (let rowOffset = -2; rowOffset <= 2; rowOffset++)
      for (let columnOffset = -2; columnOffset <= 2; columnOffset++) {
        const candidateColumn = column + columnOffset,
          candidateRow = row + rowOffset;
        if (
          candidateColumn < 0 ||
          candidateRow < 0 ||
          candidateColumn >= context.WORLD_MAP_DEFINITION.columnCount ||
          candidateRow >= context.WORLD_MAP_DEFINITION.rowCount
        )
          continue;
        const regionCode =
          context.decodedMap.regionCodesByCell[
            candidateRow * context.WORLD_MAP_DEFINITION.columnCount +
              candidateColumn
          ];
        if (regionCode) {
          const distanceSquared =
            rowOffset * rowOffset + columnOffset * columnOffset;
          if (distanceSquared < nearestDistanceSquared) {
            nearestDistanceSquared = distanceSquared;
            nearestRegionIndex = regionCode - 1;
          }
        }
      }
    return nearestRegionIndex;
  };
}
