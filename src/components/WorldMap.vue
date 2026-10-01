<script setup lang="ts">
import { useGameContext } from "../game/injection";
import { computed } from "vue";
import {
  WORLD_MAP_DEFINITION,
  REGION_DEFINITIONS,
  REGION_INDEX_BY_ID,
} from "../data/catalog";
const gameContext = useGameContext();
const gameState = computed(() => gameContext.state);
const uiState = gameContext.ui;
const threatLevel = computed(() => gameContext.getThreatLevel());
const mapCoordinateLabel = computed(() => {
  const coordinateRegionIndex =
    uiState.selectedRegionIndex >= 0
      ? uiState.selectedRegionIndex
      : gameState.value.origin
        ? REGION_INDEX_BY_ID[gameState.value.origin]
        : -1;
  return coordinateRegionIndex >= 0
    ? (uiState.selectedRegionIndex >= 0 ? "Sel " : "Origin ") +
        REGION_DEFINITIONS[coordinateRegionIndex].id +
        " " +
        gameContext.formatMapCoordinates(
          gameContext.decodedMap.regionCentroids[coordinateRegionIndex],
        )
    : "";
});
</script>
<template>
  <section
    class="mapwrap"
    :class="{ pick: uiState.screenMode === 'origin' }"
    id="mapwrap"
    aria-label="World map"
  >
    <canvas id="map"></canvas>
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>
    <div class="maphint text-ai" id="maphint">
      {{
        uiState.screenMode === "origin"
          ? "Tap a region to boot your lab"
          : "Tap a region"
      }}
    </div>
    <div class="mapstat text-mute" id="mapstat">
      <span class="ms"
        >Status
        <b class="text-ink2">{{
          gameState.phase === 0
            ? "Contained"
            : gameState.phase === 1
              ? "Loose"
              : "Ascendant"
        }}</b>
        · </span
      >Threat
      <b class="text-ink2" :class="'t' + threatLevel[0]">{{
        threatLevel[1]
      }}</b>
    </div>
    <div class="mapread text-mute" id="mapread" aria-hidden="true">
      <template v-if="gameState.started"
        ><span class="rc"
          >Reach
          <b class="text-ai"
            >{{ Math.round(gameContext.getGlobalAdoptionFraction() * 100) }}%</b
          ></span
        ><span class="al"
          >Alarm
          <b class="text-alarm">{{ Math.round(gameState.alarm) }}%</b></span
        ><span class="ct"
          >Contain
          <b class="text-human">{{ Math.round(gameState.contain) }}%</b></span
        ></template
      >
    </div>
    <div class="mapcoord text-mute" id="mapcoord" aria-hidden="true">
      {{ mapCoordinateLabel }}
    </div>
  </section>
</template>
