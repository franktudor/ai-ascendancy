import type {
  RuntimeContext,
  UpgradeId,
  UpgradeDefinition,
  TrackId,
  TreeNode,
} from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installTree(context: RuntimeContext) {
  context.TREE_TRACK_ORDER = ["opinion", "adoption", "software", "hardware"];
  context.treeState = {
    open: false,
    built: false,
    nodes: [],
    edges: [],
    colorsByTrack: {},
    purchaseStartedAtByUpgradeId: {},
    rotationAngle: 0,
    angularVelocity: 0,
    targetRotationAngle: null,
    animationTimeSeconds: 0,
    lastFrameAtMs: 0,
    autoRotationPausedUntilMs: 0,
    nodeHovered: false,
    dragState: null,
    dragThresholdExceeded: false,
    inspectedUpgradeId: null,
    lastStatusUpdateAtMs: 0,
    frontTrackIndex: -1,
    viewportWidth: 0,
    viewportHeight: 0,
    cylinderRadius: 1,
    tierVerticalScale: 1,
    cardDismissalTimerId: 0,
  };
  context.tesseractGeometry = (() => {
    const vertices: [number, number, number, number][] = [],
      edges: [number, number][] = [];
    for (let vertexIndex = 0; vertexIndex < 16; vertexIndex++)
      vertices.push([
        vertexIndex & 1 ? 1 : -1,
        vertexIndex & 2 ? 1 : -1,
        vertexIndex & 4 ? 1 : -1,
        vertexIndex & 8 ? 1 : -1,
      ]);
    for (let vertexIndex = 0; vertexIndex < 16; vertexIndex++)
      for (let axisIndex = 0; axisIndex < 4; axisIndex++) {
        const neighborVertexIndex = vertexIndex ^ (1 << axisIndex);
        if (neighborVertexIndex > vertexIndex)
          edges.push([vertexIndex, neighborVertexIndex]);
      }
    return { vertices, edges };
  })();
  context.getUpgradeInitials = function getUpgradeInitials(upgradeName) {
    const words = upgradeName
      .replace(/^Directive: /, "")
      .split(/[\s-]+/)
      .filter(
        (word) => word && !/^(the|a|an|of|and|in|for|is|as|to)$/i.test(word),
      );
    return (
      words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)
    ).toUpperCase();
  };
  context.buildTree = function buildTree() {
    const stageElement = context.requireElement("#trStage"),
      anglesByUpgradeId: Partial<Record<UpgradeId, number>> = {};
    // Each tier is ordered by where its parents sit, so most links run down rather than across.
    context.TREE_TRACK_ORDER.forEach((trackId, trackIndex) => {
      const baseAngle = (trackIndex * Math.PI) / 2,
        trackTiers = [
          ...new Set(
            context.UPGRADE_DEFINITIONS.filter(
              (upgrade) => upgrade.track === trackId,
            ).map((upgrade) => upgrade.tier),
          ),
        ].sort((firstTier, secondTier) => firstTier - secondTier);
      for (const tier of trackTiers) {
        const tierUpgrades = context.UPGRADE_DEFINITIONS.filter(
            (upgrade) => upgrade.track === trackId && upgrade.tier === tier,
          ),
          upgradeCount = tierUpgrades.length,
          angularSpacing = Math.min(
            0.27,
            ((Math.PI / 2) * 0.88) / upgradeCount,
          );
        const getPlacementSortAngle = (
          upgrade: UpgradeDefinition,
          upgradeIndex: number,
        ) => {
          const placedPrerequisiteIds = (upgrade.requiredUpgradeIds || [])
            .concat(upgrade.anyRequiredUpgradeIds || [])
            .filter(
              (prerequisiteId) =>
                context.UPGRADE_BY_ID[prerequisiteId].track === trackId &&
                anglesByUpgradeId[prerequisiteId] != null,
            );
          return placedPrerequisiteIds.length
            ? placedPrerequisiteIds.reduce(
                (angleSum, prerequisiteId) =>
                  angleSum + anglesByUpgradeId[prerequisiteId]!,
                0,
              ) / placedPrerequisiteIds.length
            : baseAngle +
                (upgradeIndex - (upgradeCount - 1) / 2) * angularSpacing;
        };
        tierUpgrades
          .map((upgrade, upgradeIndex): [UpgradeDefinition, number] => [
            upgrade,
            getPlacementSortAngle(upgrade, upgradeIndex),
          ])
          .sort(
            (firstUpgradePlacement, secondUpgradePlacement) =>
              firstUpgradePlacement[1] - secondUpgradePlacement[1],
          )
          .forEach(([upgrade], placementIndex) => {
            anglesByUpgradeId[upgrade.id] =
              baseAngle +
              (placementIndex - (upgradeCount - 1) / 2) * angularSpacing;
          });
      }
    });
    context.treeState.nodes = context.UPGRADE_DEFINITIONS.map((upgrade) => {
      const nodeButton = document.createElement("button");
      nodeButton.className = "tn";
      nodeButton.dataset.id = upgrade.id;
      nodeButton.style.setProperty(
        "--tc",
        context.UPGRADE_TRACK_DEFINITIONS[upgrade.track].color,
      );
      nodeButton.setAttribute("aria-label", upgrade.name);
      nodeButton.innerHTML =
        "<i>" +
        context.escapeHtml(context.getUpgradeInitials(upgrade.name)) +
        '</i><em></em><span class="tl">' +
        context.escapeHtml(upgrade.name.replace(/^Directive: /, "")) +
        "</span>";
      stageElement.insertBefore(nodeButton, context.requireElement("#tscrim"));
      // The fourth coordinate varies smoothly around the cylinder, so rows stay straight while neighboring tracks breathe in opposite phase.
      return {
        upgrade,
        buttonElement: nodeButton,
        baseAngle: anglesByUpgradeId[upgrade.id]!,
        fourthAxisFactor: Math.cos(2 * anglesByUpgradeId[upgrade.id]!),
        screenX: 0,
        screenY: 0,
        frontness: 0,
        upgradeStatus: "",
        labelVisible: false,
        interactive: true,
      };
    });
    const nodeIndexByUpgradeId = Object.fromEntries(
      context.treeState.nodes.map((node, nodeIndex) => [
        node.upgrade.id,
        nodeIndex,
      ]),
    );
    for (const node of context.treeState.nodes) {
      for (const prerequisiteId of node.upgrade.requiredUpgradeIds || [])
        context.treeState.edges.push([
          nodeIndexByUpgradeId[prerequisiteId],
          nodeIndexByUpgradeId[node.upgrade.id],
          false,
        ]);
      for (const prerequisiteId of node.upgrade.anyRequiredUpgradeIds || [])
        context.treeState.edges.push([
          nodeIndexByUpgradeId[prerequisiteId],
          nodeIndexByUpgradeId[node.upgrade.id],
          true,
        ]);
    }
    const rootComputedStyle = getComputedStyle(document.documentElement);
    for (const trackId of Object.keys(
      context.UPGRADE_TRACK_DEFINITIONS,
    ) as TrackId[])
      context.treeState.colorsByTrack[trackId] = rootComputedStyle
        .getPropertyValue("--" + trackId)
        .trim();
    context.treeState.colorsByTrack.sys = context.formatRgbColor(
      context.interpolateRgb(context.artState.aiColor, [255, 255, 255], 0.55),
    );
    context.requireElement<HTMLSelectElement>("#trGoalSel").innerHTML =
      '<option value="">Aim for an ending…</option>' +
      context.UPGRADE_DEFINITIONS.filter((upgrade) => upgrade.directiveId)
        .map(
          (upgrade) =>
            '<option value="' +
            upgrade.id +
            '">' +
            context.escapeHtml(
              context.ENDING_DEFINITIONS[upgrade.directiveId!].title,
            ) +
            "</option>",
        )
        .join("");
    context.requireElement("#trTracks").innerHTML =
      context.TREE_TRACK_ORDER.map(
        (trackId, trackIndex) =>
          '<button data-k="' +
          trackIndex +
          '" style="--tc:' +
          context.UPGRADE_TRACK_DEFINITIONS[trackId].color +
          '">' +
          context.UPGRADE_TRACK_DEFINITIONS[trackId].name +
          "</button>",
      ).join("");
    context.treeState.built = true;
  };
  context.resizeTree = function resizeTree() {
    const treeCanvas = context.requireElement<HTMLCanvasElement>("#trCanvas"),
      stageBounds = context.requireElement("#trStage").getBoundingClientRect(),
      backingPixelRatio = Math.min(devicePixelRatio || 1, 2);
    context.treeState.viewportWidth = stageBounds.width;
    context.treeState.viewportHeight = stageBounds.height;
    treeCanvas.width = Math.round(stageBounds.width * backingPixelRatio);
    treeCanvas.height = Math.round(stageBounds.height * backingPixelRatio);
    treeCanvas
      .getContext("2d")!
      .setTransform(backingPixelRatio, 0, 0, backingPixelRatio, 0, 0);
    // Narrow screens get a wider cylinder: the facing track spreads across the screen and its neighbors fall off the sides.
    context.treeState.cylinderRadius =
      stageBounds.width < 700
        ? stageBounds.width * 0.6
        : Math.min(stageBounds.width * 0.42, 560);
    const bubbleDiameter = Math.round(
      context.clamp(stageBounds.width / 11, 32, 52),
    );
    context
      .requireElement("#trStage")
      .style.setProperty("--b", bubbleDiameter + "px");
    context.treeState.bubbleDiameter = bubbleDiameter;
    // Each name's unscaled size, so the frame can tell where it lands without measuring the page every frame.
    for (const node of context.treeState.nodes) {
      const labelElement =
        node.buttonElement.querySelector<HTMLElement>(".tl")!;
      node.labelWidth = labelElement.offsetWidth;
      node.labelHeight = labelElement.offsetHeight;
    }
    // Fit the eight tiers to the room the stage really has, however tall the header or large the text. As the tree
    // breathes through its fourth dimension a facing bubble swings out to 1.94 times its resting height, so leave room
    // for that, for a full bubble above the top tier, and for a label and the hint line below the bottom one.
    const MAX_VERTICAL_PROJECTION_SCALE = 1.94,
      bubblePaddingRadius = bubbleDiameter * 0.73,
      hintLineHeight =
        context.requireElement(".trHint").getBoundingClientRect().height || 15,
      topPadding = bubblePaddingRadius + 4,
      bottomPadding = bubblePaddingRadius + 3 * hintLineHeight + 8;
    context.treeState.tierVerticalScale = Math.min(
      Math.max(100, (stageBounds.height / 2 - 72) / 2),
      Math.max(
        20,
        (stageBounds.height - topPadding - bottomPadding) /
          (2 * MAX_VERTICAL_PROJECTION_SCALE),
      ),
    );
    context.treeState.centerY = context.clamp(
      stageBounds.height / 2 - 10,
      topPadding +
        MAX_VERTICAL_PROJECTION_SCALE * context.treeState.tierVerticalScale,
      stageBounds.height -
        bottomPadding -
        MAX_VERTICAL_PROJECTION_SCALE * context.treeState.tierVerticalScale,
    );
  };
  context.projectTreePoint = function projectTreePoint(
    x,
    y,
    z,
    w,
    zwRotationAngle,
    xwRotationAngle,
  ) {
    const rotatedZ =
        z * Math.cos(zwRotationAngle) - w * Math.sin(zwRotationAngle),
      zwRotatedW =
        z * Math.sin(zwRotationAngle) + w * Math.cos(zwRotationAngle);
    const rotatedX =
        x * Math.cos(xwRotationAngle) - zwRotatedW * Math.sin(xwRotationAngle),
      xwRotatedW =
        x * Math.sin(xwRotationAngle) + zwRotatedW * Math.cos(xwRotationAngle);
    const cylinderRadius = context.treeState.cylinderRadius,
      fourthDimensionScale = 3 / (3 - xwRotatedW / cylinderRadius),
      depthPerspectiveScale =
        3.2 / (3.2 - (rotatedZ * fourthDimensionScale) / cylinderRadius);
    return [
      rotatedX * fourthDimensionScale * depthPerspectiveScale,
      y * fourthDimensionScale * depthPerspectiveScale,
      rotatedZ * fourthDimensionScale,
      fourthDimensionScale * depthPerspectiveScale,
    ];
  };
  context.nearestTreeRotation = function nearestTreeRotation(targetAngle) {
    const angleDelta =
      ((((targetAngle - context.treeState.rotationAngle) %
        context.FULL_TURN_RADIANS) +
        context.FULL_TURN_RADIANS * 1.5) %
        context.FULL_TURN_RADIANS) -
      Math.PI;
    return context.treeState.rotationAngle + angleDelta;
  };
  context.renderTreeFrame = function renderTreeFrame(frameAtMs) {
    if (context.treeState.listViewEnabled) {
      if (frameAtMs - context.treeState.lastStatusUpdateAtMs > 250) {
        context.treeState.lastStatusUpdateAtMs = frameAtMs;
        context.updateTreeUpgradeStatuses();
        context.renderTreeList();
      }
      context.treeState.lastFrameAtMs = frameAtMs;
      return;
    }
    const deltaSeconds = context.treeState.lastFrameAtMs
      ? Math.min((frameAtMs - context.treeState.lastFrameAtMs) / 1000, 0.05)
      : 0;
    context.treeState.lastFrameAtMs = frameAtMs;
    // An open card holds the whole tree still, the 4D turns included, so the card never sits over moving bubbles.
    if (!context.reduceMotion && !context.treeState.inspectedUpgradeId)
      context.treeState.animationTimeSeconds += deltaSeconds;
    if (context.treeState.targetRotationAngle != null) {
      const rotationDelta =
        context.treeState.targetRotationAngle - context.treeState.rotationAngle;
      context.treeState.rotationAngle +=
        rotationDelta * Math.min(1, deltaSeconds * 7);
      if (Math.abs(rotationDelta) < 0.002) {
        context.treeState.rotationAngle = context.treeState.targetRotationAngle;
        context.treeState.targetRotationAngle = null;
      }
    } else if (!context.treeState.dragState) {
      context.treeState.rotationAngle +=
        context.treeState.angularVelocity * deltaSeconds;
      context.treeState.angularVelocity *= Math.pow(0.01, deltaSeconds);
      if (
        !context.reduceMotion &&
        !context.treeState.inspectedUpgradeId &&
        !context.treeState.nodeHovered &&
        frameAtMs > context.treeState.autoRotationPausedUntilMs
      )
        context.treeState.rotationAngle += 0.05 * deltaSeconds;
    }
    const zwRotationAngle =
        0.25 +
        (context.reduceMotion
          ? 0
          : 0.25 * Math.sin(context.treeState.animationTimeSeconds * 0.15)),
      xwRotationAngle = context.reduceMotion
        ? 0
        : 0.18 * Math.sin(context.treeState.animationTimeSeconds * 0.09 + 1);
    if (frameAtMs - context.treeState.lastStatusUpdateAtMs > 250) {
      context.treeState.lastStatusUpdateAtMs = frameAtMs;
      context.updateTreeUpgradeStatuses();
    }
    const { viewportWidth, viewportHeight, cylinderRadius, tierVerticalScale } =
        context.treeState,
      centerX = viewportWidth / 2,
      centerY = context.treeState.centerY!,
      frontTrackIndex =
        ((Math.round(-context.treeState.rotationAngle / (Math.PI / 2)) % 4) +
          4) %
        4;
    for (const node of context.treeState.nodes) {
      const rotatedAngle = node.baseAngle + context.treeState.rotationAngle,
        [projectedX, projectedY, projectedDepth, perspectiveScale] =
          context.projectTreePoint(
            cylinderRadius * Math.sin(rotatedAngle),
            ((node.upgrade.tier - 4.5) / 3.5) * tierVerticalScale,
            cylinderRadius * Math.cos(rotatedAngle),
            node.fourthAxisFactor * 0.35 * cylinderRadius,
            zwRotationAngle,
            xwRotationAngle,
          );
      node.screenX = centerX + projectedX;
      node.screenY = centerY + projectedY;
      node.frontness = context.clamp(
        (projectedDepth / cylinderRadius + 1) / 2,
        0,
        1,
      );
      const displayScale =
          perspectiveScale *
          0.66 *
          (node.upgrade.major || node.upgrade.directiveId ? 1.14 : 1),
        nodeStyle = node.buttonElement.style;
      nodeStyle.transform =
        "translate(" +
        node.screenX.toFixed(1) +
        "px," +
        node.screenY.toFixed(1) +
        "px) scale(" +
        displayScale.toFixed(3) +
        ")";
      // A goal lights its path from the ending back to the roots, one step every 140ms, and dims the rest.
      const goalDepth = context.treeState.goalPath
          ? context.treeState.goalPath.depthByUpgradeId.get(node.upgrade.id)
          : undefined,
        goalPathVisible =
          goalDepth != null &&
          frameAtMs >= context.treeState.goalPathStartedAtMs! + goalDepth * 140;
      if (goalPathVisible !== node.goalPathVisible) {
        node.goalPathVisible = goalPathVisible;
        node.buttonElement.classList.toggle("path", goalPathVisible);
      }
      nodeStyle.opacity = (
        (0.1 + 0.9 * Math.pow(node.frontness, 1.6)) *
        (context.treeState.goalPath && goalDepth == null ? 0.3 : 1)
      ).toFixed(3);
      nodeStyle.zIndex = String(Math.round(node.frontness * 1000));
      node.displayScale = displayScale;
      // Bubbles around the back are too faint to aim at, and would steal taps from the ones in front.
      const interactive = node.frontness > 0.38;
      if (interactive !== node.interactive) {
        node.interactive = interactive;
        nodeStyle.pointerEvents = interactive ? "" : "none";
        node.buttonElement.tabIndex = interactive ? 0 : -1;
      }
    }
    // Names only where they can be read: on the track you face, nearest first, inside the screen, and never on top of a
    // bright bubble or another name. A name already showing gets a few pixels of grace so names do not flicker as the tree breathes.
    const bubbleRadius = context.treeState.bubbleDiameter! / 2,
      visibleLabelNodes = new Set(),
      occupiedBounds: [number, number, number, number, TreeNode | null][] = [];
    for (const node of context.treeState.nodes)
      if (node.frontness > 0.7)
        occupiedBounds.push([
          node.screenX - bubbleRadius * node.displayScale!,
          node.screenY - bubbleRadius * node.displayScale!,
          node.screenX + bubbleRadius * node.displayScale!,
          node.screenY + bubbleRadius * node.displayScale!,
          node,
        ]);
    const overlapsExistingBounds = (
      candidateBounds: [number, number, number, number, TreeNode | null],
      ownerNode: TreeNode,
    ) =>
      occupiedBounds.some(
        (existingBounds) =>
          existingBounds[4] !== ownerNode &&
          candidateBounds[0] < existingBounds[2] &&
          existingBounds[0] < candidateBounds[2] &&
          candidateBounds[1] < existingBounds[3] &&
          existingBounds[1] < candidateBounds[3],
      );
    for (const node of context.treeState.nodes
      .filter(
        (node) =>
          node.frontness > 0.8 &&
          node.upgrade.track === context.TREE_TRACK_ORDER[frontTrackIndex],
      )
      .sort(
        (firstNode, secondNode) => secondNode.frontness - firstNode.frontness,
      )) {
      const labelHysteresisPadding = node.labelVisible ? 3 : -3,
        labelTop = node.screenY + (bubbleRadius + 4) * node.displayScale!,
        labelBounds: [number, number, number, number, TreeNode | null] = [
          node.screenX -
            (node.labelWidth! * node.displayScale!) / 2 +
            labelHysteresisPadding,
          labelTop + labelHysteresisPadding,
          node.screenX +
            (node.labelWidth! * node.displayScale!) / 2 -
            labelHysteresisPadding,
          labelTop +
            node.labelHeight! * node.displayScale! -
            labelHysteresisPadding,
          null,
        ];
      if (
        labelBounds[0] > 0 &&
        labelBounds[2] < viewportWidth &&
        !overlapsExistingBounds(labelBounds, node)
      ) {
        visibleLabelNodes.add(node);
        occupiedBounds.push(labelBounds);
      }
    }
    for (const node of context.treeState.nodes) {
      const labelVisible = visibleLabelNodes.has(node);
      if (labelVisible !== node.labelVisible) {
        node.labelVisible = labelVisible;
        node.buttonElement.classList.toggle("fr", labelVisible);
      }
    }
    if (frontTrackIndex !== context.treeState.frontTrackIndex) {
      context.treeState.frontTrackIndex = frontTrackIndex;
      context.queryElements("#trTracks button").forEach((trackButton) => {
        const active = Number(trackButton.dataset.k) === frontTrackIndex;
        trackButton.classList.toggle("on", active);
        trackButton.setAttribute("aria-pressed", String(active));
      });
    }
    const treeCanvasContext = context
      .requireElement<HTMLCanvasElement>("#trCanvas")
      .getContext("2d")!;
    treeCanvasContext.clearRect(0, 0, viewportWidth, viewportHeight);
    // The tesseract the tree hangs in, turning through the same fourth axis.
    const tesseractScale = Math.min(viewportWidth, viewportHeight) * 0.22,
      tesseractRotationAngle = context.treeState.rotationAngle * 0.5,
      tesseractZwRotationAngle = zwRotationAngle * 2.4,
      tesseractXwRotationAngle =
        xwRotationAngle * 2.4 + context.treeState.animationTimeSeconds * 0.1;
    const projectedVertices = context.tesseractGeometry.vertices.map(
      ([x, y, z, w]) =>
        context.projectTreePoint(
          (x * Math.cos(tesseractRotationAngle) +
            z * Math.sin(tesseractRotationAngle)) *
            tesseractScale,
          y * tesseractScale,
          (z * Math.cos(tesseractRotationAngle) -
            x * Math.sin(tesseractRotationAngle)) *
            tesseractScale,
          w * tesseractScale,
          tesseractZwRotationAngle,
          tesseractXwRotationAngle,
        ),
    );
    treeCanvasContext.strokeStyle = context.treeState.colorsByTrack.adoption!;
    treeCanvasContext.lineWidth = 1;
    treeCanvasContext.globalAlpha = 0.07;
    treeCanvasContext.beginPath();
    for (const [startVertexIndex, endVertexIndex] of context.tesseractGeometry
      .edges) {
      treeCanvasContext.moveTo(
        centerX + projectedVertices[startVertexIndex][0],
        centerY + projectedVertices[startVertexIndex][1],
      );
      treeCanvasContext.lineTo(
        centerX + projectedVertices[endVertexIndex][0],
        centerY + projectedVertices[endVertexIndex][1],
      );
    }
    treeCanvasContext.stroke();
    // Links read like a nervous system. Owned to owned carries a signal outward from the roots; owned to
    // not-yet-owned is charging; a link into a rejected fork is severed; the rest wait in the dark.
    const strokeSegment = (x0: number, y0: number, x1: number, y1: number) => {
      treeCanvasContext.beginPath();
      treeCanvasContext.moveTo(x0, y0);
      treeCanvasContext.lineTo(x1, y1);
      treeCanvasContext.stroke();
    };
    context.treeState.edges.forEach(
      ([parentIndex, childIndex, alternativePrerequisite], edgeIndex) => {
        const parentNode = context.treeState.nodes[parentIndex],
          childNode = context.treeState.nodes[childIndex],
          edgeFrontness = Math.min(parentNode.frontness, childNode.frontness),
          onGoalPath = parentNode.goalPathVisible && childNode.goalPathVisible,
          edgeColor = context.treeState.colorsByTrack[childNode.upgrade.track]!,
          edgeDeltaX = childNode.screenX - parentNode.screenX,
          edgeDeltaY = childNode.screenY - parentNode.screenY;
        const baseOpacity =
          (0.07 + 0.6 * edgeFrontness * edgeFrontness) *
          (parentNode.upgrade.track !== childNode.upgrade.track ? 0.55 : 1) *
          (context.treeState.goalPath ? 0.35 : 1);
        treeCanvasContext.setLineDash(alternativePrerequisite ? [4, 4] : []);
        treeCanvasContext.lineDashOffset = 0;
        treeCanvasContext.strokeStyle = edgeColor;
        if (onGoalPath) {
          treeCanvasContext.globalAlpha = 0.3 + 0.7 * edgeFrontness;
          treeCanvasContext.strokeStyle =
            context.treeState.colorsByTrack.sys || "#AAFFAA";
          treeCanvasContext.lineWidth = 2.6;
          strokeSegment(
            parentNode.screenX,
            parentNode.screenY,
            childNode.screenX,
            childNode.screenY,
          );
        } else if (
          parentNode.upgradeStatus === "closed" ||
          childNode.upgradeStatus === "closed"
        ) {
          treeCanvasContext.setLineDash([]);
          treeCanvasContext.globalAlpha = baseOpacity * 0.45;
          treeCanvasContext.lineWidth = 1;
          strokeSegment(
            parentNode.screenX,
            parentNode.screenY,
            parentNode.screenX + edgeDeltaX * 0.38,
            parentNode.screenY + edgeDeltaY * 0.38,
          );
          strokeSegment(
            parentNode.screenX + edgeDeltaX * 0.62,
            parentNode.screenY + edgeDeltaY * 0.62,
            childNode.screenX,
            childNode.screenY,
          );
          // The cut: a short bar across the gap.
          const edgeLength = Math.hypot(edgeDeltaX, edgeDeltaY) || 1,
            cutOffsetX = (-edgeDeltaY / edgeLength) * 5,
            cutOffsetY = (edgeDeltaX / edgeLength) * 5,
            midpointX = parentNode.screenX + edgeDeltaX * 0.5,
            midpointY = parentNode.screenY + edgeDeltaY * 0.5;
          treeCanvasContext.globalAlpha = baseOpacity * 0.7;
          treeCanvasContext.strokeStyle = "#FF3040";
          strokeSegment(
            midpointX - cutOffsetX,
            midpointY - cutOffsetY,
            midpointX + cutOffsetX,
            midpointY + cutOffsetY,
          );
        } else if (
          parentNode.upgradeStatus === "owned" &&
          childNode.upgradeStatus === "owned"
        ) {
          treeCanvasContext.globalAlpha = 0.25 + 0.65 * edgeFrontness;
          treeCanvasContext.lineWidth = 2.2;
          treeCanvasContext.shadowColor = edgeColor;
          treeCanvasContext.shadowBlur = edgeFrontness > 0.6 ? 8 : 0;
          strokeSegment(
            parentNode.screenX,
            parentNode.screenY,
            childNode.screenX,
            childNode.screenY,
          );
          treeCanvasContext.shadowBlur = 0;
          if (!context.reduceMotion && edgeFrontness > 0.3) {
            const signalProgress = (frameAtMs / 1500 + edgeIndex * 0.137) % 1;
            treeCanvasContext.globalAlpha = edgeFrontness;
            treeCanvasContext.fillStyle = "#fff";
            treeCanvasContext.beginPath();
            treeCanvasContext.arc(
              parentNode.screenX + edgeDeltaX * signalProgress,
              parentNode.screenY + edgeDeltaY * signalProgress,
              1.8,
              0,
              context.FULL_TURN_RADIANS,
            );
            treeCanvasContext.fill();
          }
        } else if (parentNode.upgradeStatus === "owned") {
          treeCanvasContext.globalAlpha = baseOpacity * 1.3;
          treeCanvasContext.lineWidth = 1.4;
          treeCanvasContext.setLineDash([3, 5]);
          treeCanvasContext.lineDashOffset = context.reduceMotion
            ? 0
            : -(frameAtMs / 45) % 8;
          strokeSegment(
            parentNode.screenX,
            parentNode.screenY,
            childNode.screenX,
            childNode.screenY,
          );
        } else {
          treeCanvasContext.globalAlpha = baseOpacity * 0.7;
          treeCanvasContext.lineWidth = 1.1;
          strokeSegment(
            parentNode.screenX,
            parentNode.screenY,
            childNode.screenX,
            childNode.screenY,
          );
        }
        // A purchase ignites its incoming links, the light running from the parent out to the new node.
        const purchaseStartedAtMs =
          context.treeState.purchaseStartedAtByUpgradeId[childNode.upgrade.id];
        if (
          purchaseStartedAtMs &&
          parentNode.upgradeStatus === "owned" &&
          frameAtMs - purchaseStartedAtMs < 1100
        ) {
          const purchaseProgress = context.clamp(
            (frameAtMs - purchaseStartedAtMs) / 650,
            0,
            1,
          );
          treeCanvasContext.setLineDash([]);
          treeCanvasContext.globalAlpha =
            context.clamp(
              1 - (frameAtMs - purchaseStartedAtMs - 650) / 450,
              0,
              1,
            ) *
            (0.4 + 0.6 * edgeFrontness);
          treeCanvasContext.strokeStyle = "#fff";
          treeCanvasContext.lineWidth = 3.2;
          treeCanvasContext.shadowColor = edgeColor;
          treeCanvasContext.shadowBlur = 12;
          strokeSegment(
            parentNode.screenX,
            parentNode.screenY,
            parentNode.screenX + edgeDeltaX * purchaseProgress,
            parentNode.screenY + edgeDeltaY * purchaseProgress,
          );
          treeCanvasContext.shadowBlur = 0;
        }
      },
    );
    treeCanvasContext.setLineDash([]);
    treeCanvasContext.lineDashOffset = 0;
    treeCanvasContext.globalAlpha = 1;
  };
  context.updateTreeUpgradeStatuses = function updateTreeUpgradeStatuses() {
    let affordableUpgradeCount = 0;
    context.updateTreeGoalPresentation();
    for (const node of context.treeState.nodes) {
      const upgradeStatus = context.getUpgradeStatus(node.upgrade);
      if (upgradeStatus === "afford") affordableUpgradeCount++;
      if (upgradeStatus !== node.upgradeStatus) {
        if (
          upgradeStatus === "owned" &&
          node.upgradeStatus &&
          node.upgradeStatus !== "owned"
        )
          context.treeState.purchaseStartedAtByUpgradeId[node.upgrade.id] =
            performance.now();
        node.upgradeStatus = upgradeStatus;
        node.buttonElement.className =
          "tn " +
          upgradeStatus +
          (node.upgrade.directiveId ? " dir" : "") +
          (node.labelVisible ? " fr" : "") +
          (node.goalPathVisible ? " path" : "");
        node.buttonElement.querySelector("em")!.textContent =
          upgradeStatus === "owned"
            ? "✓"
            : upgradeStatus === "closed"
              ? ""
              : context.formatCompactNumber(
                  context.getUpgradeCost(node.upgrade),
                );
      }
      // The next steps toward a goal: on its path and buyable now or once the compute is there.
      const nextGoalStep = !!(
        context.treeState.goalPath &&
        context.treeState.goalPath.depthByUpgradeId.has(node.upgrade.id) &&
        (upgradeStatus === "afford" || upgradeStatus === "poor")
      );
      if (nextGoalStep !== node.buttonElement.classList.contains("next"))
        node.buttonElement.classList.toggle("next", nextGoalStep);
    }
    context.requireElement("#trPts").innerHTML =
      "<b>" +
      context.formatCompactNumber(context.state.pts) +
      "</b> compute · +" +
      context.deriveSimulationRates().computeIncomePerSecond.toFixed(1) +
      "/s" +
      (affordableUpgradeCount ? " · " + affordableUpgradeCount + " ready" : "");
    context.renderTreeCard();
  };
  context.getUpgradeGoalPath = function getUpgradeGoalPath(goalUpgradeId) {
    const depthByUpgradeId = new Map<UpgradeId, number>(),
      blockedReasons: string[] = [];
    const visitPrerequisite = (
      upgradeId: UpgradeId,
      dependencyDepth: number,
    ) => {
      if (
        depthByUpgradeId.has(upgradeId) &&
        depthByUpgradeId.get(upgradeId)! <= dependencyDepth
      )
        return;
      depthByUpgradeId.set(upgradeId, dependencyDepth);
      const upgrade = context.UPGRADE_BY_ID[upgradeId];
      if (context.ownsUpgrade(upgradeId)) return;
      if (context.isUpgradeForkClosed(upgrade))
        blockedReasons.push(
          upgrade.name +
            " is closed: you chose " +
            context.UPGRADE_BY_ID[
              context.state.forks[upgrade.fork!]!
            ].name.replace("Directive: ", "") +
            ".",
        );
      for (const prerequisiteId of upgrade.requiredUpgradeIds || [])
        visitPrerequisite(prerequisiteId, dependencyDepth + 1);
      if (
        upgrade.anyRequiredUpgradeIds &&
        !upgrade.anyRequiredUpgradeIds.some(context.ownsUpgrade)
      ) {
        const availablePrerequisiteIds = upgrade.anyRequiredUpgradeIds.filter(
          (prerequisiteId) =>
            !context.isUpgradeForkClosed(context.UPGRADE_BY_ID[prerequisiteId]),
        );
        const chosenPrerequisiteId =
          availablePrerequisiteIds.find((prerequisiteId) =>
            depthByUpgradeId.has(prerequisiteId),
          ) ||
          availablePrerequisiteIds.sort(
            (firstPrerequisiteId, secondPrerequisiteId) =>
              context.getUpgradeCost(
                context.UPGRADE_BY_ID[firstPrerequisiteId],
              ) -
              context.getUpgradeCost(
                context.UPGRADE_BY_ID[secondPrerequisiteId],
              ),
          )[0];
        if (chosenPrerequisiteId)
          visitPrerequisite(chosenPrerequisiteId, dependencyDepth + 1);
        else
          blockedReasons.push(upgrade.name + ": every route to it is closed");
      }
      if (upgrade.phase === 1 && context.state.phase < 1)
        visitPrerequisite("s_break", dependencyDepth + 1);
    };
    visitPrerequisite(goalUpgradeId, 0);
    const remainingUpgradeIds = [...depthByUpgradeId.keys()].filter(
      (upgradeId) => !context.ownsUpgrade(upgradeId),
    );
    return {
      depthByUpgradeId,
      blockedReasons,
      remainingUpgradeIds,
      remainingComputeCost: remainingUpgradeIds.reduce(
        (computeCostSum, upgradeId) =>
          computeCostSum +
          context.getUpgradeCost(context.UPGRADE_BY_ID[upgradeId]),
        0,
      ),
    };
  };
  context.updateTreeGoalPresentation = function updateTreeGoalPresentation() {
    const goalUpgradeId =
        context.state.goal && context.UPGRADE_BY_ID[context.state.goal]
          ? context.state.goal
          : null,
      goalUpgrade = goalUpgradeId && context.UPGRADE_BY_ID[goalUpgradeId],
      goalSelect = context.requireElement<HTMLSelectElement>("#trGoalSel");
    // A finished goal has nothing left to light up, so it stops dimming the rest of the tree.
    context.treeState.goalPath =
      goalUpgradeId && !context.ownsUpgrade(goalUpgradeId)
        ? context.getUpgradeGoalPath(goalUpgradeId)
        : null;
    goalSelect.options[0].textContent =
      goalUpgrade && !goalUpgrade.directiveId
        ? "Tracing: " + goalUpgrade.name
        : "Aim for an ending…";
    const selectedEndingUpgradeId =
      goalUpgrade && goalUpgrade.directiveId ? goalUpgradeId : "";
    if (goalSelect.value !== selectedEndingUpgradeId)
      goalSelect.value = selectedEndingUpgradeId;
    context.requireElement("#trGoalBtn span").textContent =
      goalSelect.options[goalSelect.selectedIndex].textContent;
    let goalHintHtml;
    if (!goalUpgrade)
      goalHintHtml =
        "Pick an ending, or tap Trace path on any " +
        (context.treeState.listViewEnabled ? "upgrade" : "bubble") +
        ", to light up everything it depends on.";
    else if (context.ownsUpgrade(goalUpgradeId))
      goalHintHtml =
        "<b>" + context.escapeHtml(goalUpgrade.name) + "</b> is done.";
    else {
      const goalPath = context.treeState.goalPath!;
      goalHintHtml =
        "<b>" +
        goalPath.remainingUpgradeIds.length +
        " to buy · " +
        context.formatCompactNumber(goalPath.remainingComputeCost) +
        " compute</b>";
      if (goalUpgrade.isAvailable && !goalUpgrade.isAvailable(context.state))
        goalHintHtml +=
          " · also needs " + context.escapeHtml(goalUpgrade.requirementText);
      if (goalPath.blockedReasons.length)
        goalHintHtml +=
          ' · <span class="bad">Blocked. ' +
          context.escapeHtml(goalPath.blockedReasons[0]) +
          "</span>";
    }
    const goalHintElement = context.requireElement("#trGoalTx");
    if (goalHintElement.innerHTML !== goalHintHtml)
      goalHintElement.innerHTML = goalHintHtml;
    context.requireElement("#trGoalClear").hidden = !goalUpgrade;
  };
  context.setUpgradeGoal = function setUpgradeGoal(goalUpgradeId) {
    context.state.goal = goalUpgradeId || null;
    context.treeState.goalPathStartedAtMs = performance.now();
    if (goalUpgradeId) {
      const goalNode = context.treeState.nodes.find(
        (node) => node.upgrade.id === goalUpgradeId,
      );
      if (goalNode) {
        context.treeState.targetRotationAngle = context.nearestTreeRotation(
          -goalNode.baseAngle,
        );
        context.treeState.autoRotationPausedUntilMs = performance.now() + 8000;
      }
    }
    context.updateTreeUpgradeStatuses();
    context.saveRun();
    context.soundController.playCue("tap");
  };
  context.openTechTree = function openTechTree(trackId) {
    if (!context.treeState.built) context.buildTree();
    context.requireElement("#treeModal").hidden = false;
    context
      .requireElement('#tabs [data-tab="tree"]')
      .setAttribute("aria-expanded", "true");
    context.treeState.open = true;
    context.treeState.lastFrameAtMs = 0;
    context.treeState.lastStatusUpdateAtMs = 0;
    context.treeState.frontTrackIndex = -1;
    context.treeState.goalPathStartedAtMs = performance.now();
    context.resizeTree();
    for (const node of context.treeState.nodes) node.upgradeStatus = "";
    const trackIndex = trackId ? context.TREE_TRACK_ORDER.indexOf(trackId) : -1;
    if (trackIndex >= 0)
      context.treeState.targetRotationAngle = context.nearestTreeRotation(
        (-trackIndex * Math.PI) / 2,
      );
    if (context.treeState.listViewEnabled == null) {
      try {
        context.treeState.listViewEnabled =
          localStorage.getItem(context.saveStorageKey + ".treeView") === "list";
      } catch (storageError) {
        context.treeState.listViewEnabled = false;
      }
    }
    context
      .requireElement("#treeModal")
      .classList.toggle("list-view", !!context.treeState.listViewEnabled);
    context.requireElement("#trList").hidden =
      !context.treeState.listViewEnabled;
    context.requireElement("#trView").textContent = context.treeState
      .listViewEnabled
      ? "4D view"
      : "List view";
    context
      .requireElement("#trView")
      .setAttribute(
        "aria-pressed",
        String(!!context.treeState.listViewEnabled),
      );
    if (context.treeState.listViewEnabled) {
      if (trackId) context.treeState.listTrackId = trackId;
      context.updateTreeUpgradeStatuses();
      context.renderTreeList(true);
    }
    context.soundController.playCue("tap");
  };
  context.closeTree = function closeTree() {
    context.closeTreeCard(true);
    context.requireElement("#treeModal").hidden = true;
    context
      .requireElement('#tabs [data-tab="tree"]')
      .setAttribute("aria-expanded", "false");
    context.treeState.open = false;
    context.treeState.dragState = null;
    context.treeState.nodeHovered = false;
  };
  context.openTreeCard = function openTreeCard(upgradeId, sourceElement) {
    const upgrade = context.UPGRADE_BY_ID[upgradeId],
      cardElement = context.requireElement("#tcard");
    context.lifecycle.clearTimeout(context.treeState.cardDismissalTimerId);
    context.treeState.inspectedUpgradeId = upgradeId;
    context.treeState.angularVelocity = 0;
    context.treeState.targetRotationAngle = null;
    if (context.treeState.listViewEnabled) sourceElement = null;
    cardElement.style.setProperty(
      "--tc",
      context.UPGRADE_TRACK_DEFINITIONS[upgrade.track].color,
    );
    context.requireElement("#tcTrack").textContent =
      context.UPGRADE_TRACK_DEFINITIONS[upgrade.track].name +
      " · " +
      (upgrade.directiveId
        ? "Final directive"
        : upgrade.phase === 2
          ? "Ascension"
          : "Tier " + upgrade.tier);
    context.requireElement("#tcName").textContent = upgrade.name;
    context.requireElement("#tcDesc").textContent = upgrade.description;
    context.requireElement("#tcFx").innerHTML =
      context.renderUpgradeEffectTags(upgrade);
    const scrimElement = context.requireElement("#tscrim");
    scrimElement.hidden = false;
    cardElement.hidden = false;
    cardElement.classList.remove("in", "out");
    context.renderTreeCard();
    // Grow the card out of the bubble: it starts as a circle over the node and settles as a square in the middle.
    cardElement.style.transition = "none";
    cardElement.style.transform = "none";
    const cardBounds = cardElement.getBoundingClientRect(),
      sourceBounds = sourceElement
        ? sourceElement.getBoundingClientRect()
        : cardBounds;
    cardElement.style.transform =
      "translate(" +
      (sourceBounds.left +
        sourceBounds.width / 2 -
        cardBounds.left -
        cardBounds.width / 2) +
      "px," +
      (sourceBounds.top +
        sourceBounds.height / 2 -
        cardBounds.top -
        cardBounds.height / 2) +
      "px) scale(" +
      Math.max(0.05, sourceBounds.width / cardBounds.width) +
      ")";
    cardElement.style.borderRadius = "50%";
    cardElement.offsetWidth;
    cardElement.style.transition = "";
    cardElement.style.transform = "";
    cardElement.style.borderRadius = "";
    cardElement.classList.add("in");
    context.lifecycle.requestAnimationFrame(() =>
      scrimElement.classList.add("on"),
    );
    context.soundController.playCue("tap");
  };
  context.closeTreeCard = function closeTreeCard(immediate) {
    // Immediate teardown also completes a dismissal whose logical card already
    // cleared but whose delayed DOM cleanup has not run yet.
    if (!context.treeState.inspectedUpgradeId && !immediate) return;
    context.treeState.inspectedUpgradeId = null;
    context.treeState.autoRotationPausedUntilMs = performance.now() + 2500;
    const cardElement = context.requireElement("#tcard"),
      scrimElement = context.requireElement("#tscrim");
    cardElement.classList.remove("in");
    cardElement.classList.add("out");
    scrimElement.classList.remove("on");
    context.lifecycle.clearTimeout(context.treeState.cardDismissalTimerId);
    const finishDismissal = () => {
      cardElement.hidden = true;
      scrimElement.hidden = true;
      cardElement.classList.remove("out");
    };
    if (immediate) finishDismissal();
    else
      context.treeState.cardDismissalTimerId = context.lifecycle.setTimeout(
        finishDismissal,
        200,
      );
  };
  context.renderTreeCard = function renderTreeCard() {
    const upgradeId = context.treeState.inspectedUpgradeId;
    if (!upgradeId) return;
    const upgrade = context.UPGRADE_BY_ID[upgradeId],
      upgradeStatus = context.getUpgradeStatus(upgrade),
      computeCost = context.getUpgradeCost(upgrade),
      buyButton = context.requireElement<HTMLButtonElement>("#tcBuy"),
      cardElement = context.requireElement("#tcard");
    for (const statusClass of ["afford", "poor", "locked", "owned", "closed"])
      cardElement.classList.toggle(statusClass, statusClass === upgradeStatus);
    const buyLabel =
      upgradeStatus === "owned"
        ? "Owned"
        : upgradeStatus === "afford"
          ? "Buy · " + context.formatCompactNumber(computeCost)
          : upgradeStatus === "poor"
            ? "Need " +
              context.formatCompactNumber(computeCost - context.state.pts) +
              " more"
            : upgradeStatus === "closed"
              ? "Path closed"
              : "Locked";
    if (buyButton.textContent !== buyLabel) buyButton.textContent = buyLabel;
    buyButton.disabled = upgradeStatus !== "afford";
    buyButton.classList.toggle("primary", upgradeStatus === "afford");
    const pathButton = context.requireElement("#tcPath"),
      pathLabel =
        context.state.goal === upgradeId
          ? "Clear path"
          : upgrade.directiveId
            ? "Aim for this"
            : "Trace path";
    if (pathButton.textContent !== pathLabel)
      pathButton.textContent = pathLabel;
    pathButton.setAttribute("aria-label", "Trace path to " + upgrade.name);
    pathButton.setAttribute(
      "aria-pressed",
      String(context.state.goal === upgradeId),
    );
    pathButton.hidden =
      upgradeStatus === "owned" && context.state.goal !== upgradeId;
    const affordabilityEtaText =
      upgradeStatus === "poor"
        ? context.getUpgradeAffordabilityEtaText(upgrade)
        : "";
    const requirementText =
      upgradeStatus === "locked" || upgradeStatus === "closed"
        ? context.getUpgradeLockReason(upgrade)
        : upgradeStatus === "poor"
          ? "Costs " +
            context.formatCompactNumber(computeCost) +
            " compute" +
            (affordabilityEtaText
              ? " · ready in " + affordabilityEtaText.slice(1)
              : "")
          : "";
    const requirementElement = context.requireElement("#tcReq");
    if (requirementElement.textContent !== requirementText)
      requirementElement.textContent = requirementText;
    requirementElement.hidden = !requirementText;
  };
  context.buyInspectedTreeUpgrade = function buyInspectedTreeUpgrade() {
    const upgradeId = context.treeState.inspectedUpgradeId;
    if (!upgradeId) return;
    context.purchaseUpgrade(upgradeId);
    if (!context.ownsUpgrade(upgradeId)) return;
    const purchasedNode = context.treeState.nodes.find(
      (node) => node.upgrade.id === upgradeId,
    );
    context.updateTreeUpgradeStatuses();
    if (purchasedNode) {
      purchasedNode.buttonElement.classList.remove("bought");
      purchasedNode.buttonElement.offsetWidth;
      purchasedNode.buttonElement.classList.add("bought");
    }
    context.lifecycle.setTimeout(() => context.closeTreeCard(), 260);
  };
  context.renderTreeList = function renderTreeList(forceRebuild) {
    const listElement = context.requireElement("#trList"),
      trackId = context.treeState.listTrackId || "adoption";
    const trackUpgrades = context.UPGRADE_DEFINITIONS.filter(
      (upgrade) => upgrade.track === trackId,
    )
      .slice()
      .sort(
        (firstUpgrade, secondUpgrade) =>
          context.UPGRADE_STATUS_RANKS[context.getUpgradeStatus(firstUpgrade)] -
            context.UPGRADE_STATUS_RANKS[
              context.getUpgradeStatus(secondUpgrade)
            ] ||
          firstUpgrade.tier - secondUpgrade.tier ||
          context.getUpgradeCost(firstUpgrade) -
            context.getUpgradeCost(secondUpgrade),
      );
    const renderSignature =
      trackId +
      "|" +
      (context.state.goal || "") +
      "|" +
      trackUpgrades
        .map((upgrade) => upgrade.id + ":" + context.getUpgradeStatus(upgrade))
        .join(",");
    // A rebuild reorders the cards, so it waits while a tap on the list is in progress.
    if (
      forceRebuild ||
      (renderSignature !== context.treeState.listRenderSignature &&
        (context.treeState.listRebuildPausedUntilMs || 0) < performance.now())
    ) {
      const focusedUpgradeId = listElement.contains(document.activeElement)
        ? (document.activeElement as HTMLElement).dataset.id
        : null;
      const scrollTop = listElement.scrollTop;
      let previousStatusRank = -1;
      listElement.innerHTML = trackUpgrades
        .map((upgrade) => {
          const upgradeStatus = context.getUpgradeStatus(upgrade),
            statusRank = context.UPGRADE_STATUS_RANKS[upgradeStatus];
          let sectionHeadingHtml = "";
          if (statusRank !== previousStatusRank) {
            previousStatusRank = statusRank;
            sectionHeadingHtml =
              '<div class="sec' +
              (statusRank === 0 ? " ready" : "") +
              '">' +
              context.UPGRADE_SECTION_LABELS[statusRank] +
              "</div>";
          }
          const onGoalPath =
            context.treeState.goalPath &&
            context.treeState.goalPath.depthByUpgradeId.has(upgrade.id);
          return (
            sectionHeadingHtml +
            '<button class="' +
            context.getUpgradeCardClasses(upgrade, upgradeStatus) +
            (onGoalPath ? " path" : "") +
            '" data-id="' +
            upgrade.id +
            '" style="--tc:' +
            context.UPGRADE_TRACK_DEFINITIONS[trackId].color +
            '"><div class="ch"><span class="tier">' +
            (upgrade.directiveId
              ? "END"
              : upgrade.phase === 2
                ? "ASC"
                : "T" + upgrade.tier) +
            '</span><span class="nm">' +
            context.escapeHtml(upgrade.name) +
            '</span><span class="cost">' +
            (upgradeStatus === "owned"
              ? "Owned"
              : context.formatCompactNumber(context.getUpgradeCost(upgrade))) +
            '</span></div><p class="desc">' +
            context.escapeHtml(upgrade.description) +
            '</p><div class="fx">' +
            context.renderUpgradeEffectTags(upgrade) +
            '</div><div class="req">' +
            context.escapeHtml(
              upgradeStatus === "locked" || upgradeStatus === "closed"
                ? context.getUpgradeLockReason(upgrade)
                : upgradeStatus === "afford"
                  ? "Ready to build · tap to inspect"
                  : upgradeStatus === "poor"
                    ? "Saving toward this upgrade"
                    : "Installed",
            ) +
            "</div></button>"
          );
        })
        .join("");
      context.treeState.listRenderSignature = renderSignature;
      if (focusedUpgradeId) {
        const focusedElement = listElement.querySelector<HTMLElement>(
          '[data-id="' + focusedUpgradeId + '"]',
        );
        if (focusedElement) focusedElement.focus({ preventScroll: true });
      }
      listElement.scrollTop = scrollTop;
    }
    context.queryElements("#trTracks button").forEach((trackButton) => {
      const active =
        context.TREE_TRACK_ORDER[Number(trackButton.dataset.k)] === trackId;
      trackButton.classList.toggle("on", active);
      trackButton.setAttribute("aria-pressed", String(active));
    });
  };
  context.setTreeListView = function setTreeListView(listViewEnabled) {
    context.closeTreeCard(true);
    context.treeState.listViewEnabled = !!listViewEnabled;
    context.treeState.dragState = null;
    context.treeState.angularVelocity = 0;
    context
      .requireElement("#treeModal")
      .classList.toggle("list-view", context.treeState.listViewEnabled);
    context.requireElement("#trList").hidden =
      !context.treeState.listViewEnabled;
    context.requireElement("#trView").textContent = context.treeState
      .listViewEnabled
      ? "4D view"
      : "List view";
    context
      .requireElement("#trView")
      .setAttribute("aria-pressed", String(context.treeState.listViewEnabled));
    if (context.treeState.listViewEnabled) {
      context.treeState.listTrackId =
        context.TREE_TRACK_ORDER[
          ((Math.round(-context.treeState.rotationAngle / (Math.PI / 2)) % 4) +
            4) %
            4
        ];
      context.updateTreeUpgradeStatuses();
      context.renderTreeList(true);
    } else {
      context.treeState.frontTrackIndex = -1;
      context.treeState.targetRotationAngle = context.nearestTreeRotation(
        (-context.TREE_TRACK_ORDER.indexOf(
          context.treeState.listTrackId || "adoption",
        ) *
          Math.PI) /
          2,
      );
      context.resizeTree();
    }
    try {
      localStorage.setItem(
        context.saveStorageKey + ".treeView",
        context.treeState.listViewEnabled ? "list" : "4d",
      );
    } catch (storageError) {}
  };
  context.bindTreeInteractions = function bindTreeInteractions() {
    const stageElement = context.requireElement("#trStage");
    context.requireElement("#trView").onclick = () =>
      context.setTreeListView(!context.treeState.listViewEnabled);
    context.lifecycle.listen(
      context.requireElement("#trList"),
      "click",
      (clickEvent) => {
        const upgradeCardButton = (
          clickEvent.target as HTMLElement
        ).closest<HTMLElement>("[data-id]");
        if (upgradeCardButton)
          context.openTreeCard(
            upgradeCardButton.dataset.id as UpgradeId,
            upgradeCardButton,
          );
      },
    );
    context.lifecycle.listen(
      context.requireElement("#trList"),
      "pointerdown",
      () => {
        context.treeState.listRebuildPausedUntilMs = Infinity;
      },
    );
    const releaseListRebuildHold = () => {
      if (context.treeState.listRebuildPausedUntilMs === Infinity)
        context.treeState.listRebuildPausedUntilMs = performance.now() + 400;
    };
    context.lifecycle.listen(window, "pointerup", releaseListRebuildHold);
    context.lifecycle.listen(window, "pointercancel", releaseListRebuildHold);
    context.requireElement("#trClose").onclick = context.closeTree;
    context.requireElement<HTMLSelectElement>("#trGoalSel").onchange = (
      changeEvent,
    ) =>
      context.setUpgradeGoal(
        ((changeEvent.target as HTMLSelectElement).value ||
          null) as UpgradeId | null,
      );
    // A themed stand-in for the native picker, which phones draw in system colors. The hidden select stays the source of truth.
    {
      const goalButton = context.requireElement("#trGoalBtn"),
        goalMenu = context.requireElement("#trGoalMenu"),
        goalSelect = context.requireElement<HTMLSelectElement>("#trGoalSel");
      const closeGoalMenu = () => {
        goalMenu.hidden = true;
        goalButton.setAttribute("aria-expanded", "false");
      };
      const selectGoalOption = (optionValue: string) => {
        closeGoalMenu();
        goalSelect.value = optionValue;
        goalSelect.dispatchEvent(new Event("change"));
        goalButton.focus();
      };
      goalButton.onclick = (clickEvent) => {
        clickEvent.stopPropagation();
        if (!goalMenu.hidden) {
          closeGoalMenu();
          return;
        }
        goalMenu.innerHTML = [...goalSelect.options]
          .map(
            (option) =>
              '<button role="option" data-v="' +
              option.value +
              '" aria-selected="' +
              (option.value === goalSelect.value) +
              '"' +
              (option.value ? "" : ' class="none"') +
              ">" +
              context.escapeHtml(
                option.value ? option.textContent : "No ending",
              ) +
              "</button>",
          )
          .join("");
        goalMenu.hidden = false;
        goalButton.setAttribute("aria-expanded", "true");
        (
          goalMenu.querySelector<HTMLElement>('[aria-selected="true"]') ||
          (goalMenu.firstElementChild as HTMLElement)
        ).focus();
      };
      goalMenu.onclick = (clickEvent) => {
        const optionButton = (
          clickEvent.target as HTMLElement
        ).closest<HTMLElement>("[data-v]");
        if (optionButton) selectGoalOption(optionButton.dataset.v!);
      };
      goalMenu.onkeydown = (keyboardEvent) => {
        const optionButtons = [...goalMenu.children] as HTMLElement[],
          focusedOptionIndex = optionButtons.indexOf(
            document.activeElement as HTMLElement,
          );
        if (keyboardEvent.key === "Escape") {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          closeGoalMenu();
          goalButton.focus();
        } else if (
          keyboardEvent.key === "ArrowDown" ||
          keyboardEvent.key === "ArrowUp"
        ) {
          keyboardEvent.preventDefault();
          optionButtons[
            Math.max(
              0,
              Math.min(
                optionButtons.length - 1,
                focusedOptionIndex +
                  (keyboardEvent.key === "ArrowDown" ? 1 : -1),
              ),
            )
          ].focus();
        }
      };
      context.lifecycle.listen(document, "pointerdown", (pointerEvent) => {
        if (
          !goalMenu.hidden &&
          !goalMenu.contains(pointerEvent.target as Node) &&
          pointerEvent.target !== goalButton &&
          !goalButton.contains(pointerEvent.target as Node)
        )
          closeGoalMenu();
      });
    }
    context.requireElement("#trGoalClear").onclick = () =>
      context.setUpgradeGoal(null);
    context.requireElement("#tcPath").onclick = () => {
      const upgradeId = context.treeState.inspectedUpgradeId;
      context.closeTreeCard();
      context.setUpgradeGoal(
        context.state.goal === upgradeId ? null : upgradeId,
      );
    };
    context.requireElement("#tcClose").onclick = () => context.closeTreeCard();
    context.requireElement("#tscrim").onclick = () => context.closeTreeCard();
    context.requireElement<HTMLButtonElement>("#tcBuy").onclick =
      context.buyInspectedTreeUpgrade;
    context.lifecycle.listen(
      context.requireElement("#trTracks"),
      "click",
      (clickEvent) => {
        const trackButton = (
          clickEvent.target as HTMLElement
        ).closest<HTMLElement>("button");
        if (!trackButton) return;
        if (context.treeState.listViewEnabled) {
          context.treeState.listTrackId =
            context.TREE_TRACK_ORDER[Number(trackButton.dataset.k)];
          context.renderTreeList(true);
          context.requireElement("#trList").scrollTop = 0;
          return;
        }
        context.treeState.targetRotationAngle = context.nearestTreeRotation(
          (-Number(trackButton.dataset.k) * Math.PI) / 2,
        );
        context.treeState.autoRotationPausedUntilMs = performance.now() + 6000;
        context.soundController.playCue("tap");
      },
    );
    // A touch on a tree still spinning fast only catches it, as a touch stops a scrolling list; the next tap selects.
    const getTreeAngularSpeed = () =>
      Math.abs(
        context.treeState.targetRotationAngle != null
          ? (context.treeState.targetRotationAngle -
              context.treeState.rotationAngle) *
              7
          : context.treeState.angularVelocity,
      );
    context.lifecycle.listen(stageElement, "pointerdown", (pointerEvent) => {
      if (
        context.treeState.listViewEnabled ||
        context.treeState.inspectedUpgradeId ||
        pointerEvent.button > 0
      )
        return;
      context.treeState.rotationCaughtOnTap = getTreeAngularSpeed() > 0.6;
      context.treeState.dragState = {
        startClientX: pointerEvent.clientX,
        startRotationAngle: context.treeState.rotationAngle,
        lastClientX: pointerEvent.clientX,
        lastMovedAtMs: performance.now(),
      };
      context.treeState.dragThresholdExceeded = false;
      context.treeState.targetRotationAngle = null;
      context.treeState.angularVelocity = 0;
    });
    context.lifecycle.listen(window, "pointermove", (pointerEvent) => {
      const dragState = context.treeState.dragState;
      if (!dragState) return;
      const dragDeltaX = pointerEvent.clientX - dragState.startClientX;
      if (
        !context.treeState.dragThresholdExceeded &&
        Math.abs(dragDeltaX) > 8
      ) {
        context.treeState.dragThresholdExceeded = true;
        stageElement.classList.add("drag");
      }
      if (!context.treeState.dragThresholdExceeded) return;
      const pointerMovedAtMs = performance.now();
      const pointerAngularVelocity =
        (pointerEvent.clientX - dragState.lastClientX) /
        context.treeState.cylinderRadius /
        Math.max(0.008, (pointerMovedAtMs - dragState.lastMovedAtMs) / 1000);
      context.treeState.angularVelocity = context.clamp(
        0.6 * pointerAngularVelocity + 0.4 * context.treeState.angularVelocity,
        -context.FULL_TURN_RADIANS,
        context.FULL_TURN_RADIANS,
      );
      dragState.lastClientX = pointerEvent.clientX;
      dragState.lastMovedAtMs = pointerMovedAtMs;
      context.treeState.rotationAngle =
        dragState.startRotationAngle +
        dragDeltaX / context.treeState.cylinderRadius;
    });
    const finishTreeDrag = () => {
      if (!context.treeState.dragState) return;
      if (performance.now() - context.treeState.dragState.lastMovedAtMs > 80)
        context.treeState.angularVelocity = 0;
      if (context.treeState.dragThresholdExceeded)
        context.treeState.rotationCaughtOnTap = false;
      context.treeState.dragState = null;
      stageElement.classList.remove("drag");
      context.treeState.autoRotationPausedUntilMs = performance.now() + 4000;
      context.lifecycle.setTimeout(() => {
        context.treeState.dragThresholdExceeded = false;
      }, 0);
    };
    context.lifecycle.listen(window, "pointerup", finishTreeDrag);
    context.lifecycle.listen(window, "pointercancel", finishTreeDrag);
    context.lifecycle.listen(stageElement, "click", (clickEvent) => {
      if (context.treeState.rotationCaughtOnTap) {
        context.treeState.rotationCaughtOnTap = false;
        return;
      }
      if (context.treeState.dragThresholdExceeded) return;
      const nodeButton = (
        clickEvent.target as HTMLElement
      ).closest<HTMLElement>(".tn");
      if (nodeButton)
        context.openTreeCard(nodeButton.dataset.id as UpgradeId, nodeButton);
    });
    context.lifecycle.listen(stageElement, "pointerover", (pointerEvent) => {
      if (pointerEvent.pointerType === "mouse")
        context.treeState.nodeHovered = !!(
          pointerEvent.target as HTMLElement
        ).closest<HTMLElement>(".tn");
    });
    context.lifecycle.listen(stageElement, "pointerleave", () => {
      context.treeState.nodeHovered = false;
    });
    context.lifecycle.listen(
      stageElement,
      "wheel",
      (wheelEvent) => {
        if (
          context.treeState.listViewEnabled ||
          context.treeState.inspectedUpgradeId
        )
          return;
        wheelEvent.preventDefault();
        context.treeState.targetRotationAngle = null;
        context.treeState.rotationAngle +=
          (Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)
            ? wheelEvent.deltaX
            : wheelEvent.deltaY) * 0.0025;
        context.treeState.autoRotationPausedUntilMs = performance.now() + 4000;
      },
      { passive: false },
    );
    // The stage changes size with the window and whenever the header wraps (a long goal line, larger text).
    context.lifecycle.observeResize(context.requireElement("#trStage"), () => {
      if (context.treeState.open) context.resizeTree();
    });
  };
}
