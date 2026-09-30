<script setup lang="ts">
import { useGameContext } from "../game/injection";
import { computed } from "vue";
import { REGION_DEFINITIONS } from "../data/catalog";
import { getRegionAccessibleLabel } from "../game/accessibility";
const gameContext = useGameContext();
const regionTiles = computed(() =>
  REGION_DEFINITIONS.map((regionDefinition, regionIndex) => {
    const regionState = gameContext.state.regions[regionIndex],
      clusterStatusClassName = !regionState.dc
        ? "none"
        : !regionState.struck
          ? "on"
          : regionState.rebuildAt
            ? "rebuild"
            : "off";
    return {
      regionDefinition,
      regionState,
      regionIndex,
      clusterStatusClassName,
      clusterStatusLabel:
        clusterStatusClassName === "none"
          ? "No cluster"
          : clusterStatusClassName === "on"
            ? "Online"
            : clusterStatusClassName === "rebuild"
              ? "Rebuild " +
                Math.max(
                  0,
                  Math.ceil(regionState.rebuildAt - gameContext.state.t),
                ) +
                "s"
              : "Offline",
      regionStatusLabel: regionState.restricted
        ? "Banned"
        : regionState.allied
          ? "Ally"
          : gameContext.state.origin === regionDefinition.id
            ? "Origin"
            : "",
      tileClasses: {
        restricted: regionState.restricted,
        allied: regionState.allied && !regionState.restricted,
        origin:
          gameContext.state.origin === regionDefinition.id &&
          !regionState.allied &&
          !regionState.restricted,
        live: regionState.a > 0.005,
        dcOn: clusterStatusClassName === "on",
        dcOff: clusterStatusClassName === "off",
        dcRebuild: clusterStatusClassName === "rebuild",
      },
    };
  }),
);
</script>
<template>
  <section class="regions" id="regions" aria-label="Regions">
    <button
      v-for="regionTile in regionTiles"
      :key="regionTile.regionDefinition.id"
      class="rt"
      :class="regionTile.tileClasses"
      :data-i="regionTile.regionIndex"
      :aria-label="
        getRegionAccessibleLabel(gameContext, regionTile.regionIndex)
      "
      @click="gameContext.openRegionDialog(regionTile.regionIndex)"
    >
      <span class="st">{{ regionTile.regionStatusLabel }}</span>
      <div class="nm">{{ regionTile.regionDefinition.shortName }}</div>
      <div class="pc">{{ Math.round(regionTile.regionState.a * 100) }}%</div>
      <div class="bar">
        <i :style="{ width: regionTile.regionState.a * 100 + '%' }"></i>
      </div>
      <div class="dcs" :class="regionTile.clusterStatusClassName">
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
        >
          <rect x="1.5" y="1.5" width="9" height="4" rx="1" />
          <rect x="1.5" y="6.5" width="9" height="4" rx="1" />
          <circle class="led" cx="8.3" cy="3.5" r=".9" stroke="none" />
          <circle class="led" cx="8.3" cy="8.5" r=".9" stroke="none" /></svg
        ><span>{{ regionTile.clusterStatusLabel }}</span>
      </div>
    </button>
  </section>
</template>
