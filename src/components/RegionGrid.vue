<script setup lang="ts">
import { useGame } from "../game/injection";
import { computed } from "vue";
import { REGIONS } from "../data/catalog";
const game = useGame();
const tiles = computed(() =>
  REGIONS.map((R, i) => {
    const r = game.state.regions[i],
      k = !r.dc ? "none" : !r.struck ? "on" : r.rebuildAt ? "rebuild" : "off";
    return {
      R,
      r,
      i,
      k,
      label:
        k === "none"
          ? "No cluster"
          : k === "on"
            ? "Online"
            : k === "rebuild"
              ? "Rebuild " +
                Math.max(0, Math.ceil(r.rebuildAt - game.state.t)) +
                "s"
              : "Offline",
      status: r.restricted
        ? "Banned"
        : r.allied
          ? "Ally"
          : game.state.origin === R.id
            ? "Origin"
            : "",
      classes: {
        restricted: r.restricted,
        allied: r.allied && !r.restricted,
        origin: game.state.origin === R.id && !r.allied && !r.restricted,
        live: r.a > 0.005,
        dcOn: k === "on",
        dcOff: k === "off",
        dcRebuild: k === "rebuild",
      },
    };
  }),
);
</script>
<template>
  <section class="regions" id="regions" aria-label="Regions">
    <button
      v-for="tile in tiles"
      :key="tile.R.id"
      class="rt"
      :class="tile.classes"
      :data-i="tile.i"
      :aria-label="tile.R.name"
      @click="game.openRegion(tile.i)"
    >
      <span class="st">{{ tile.status }}</span>
      <div class="nm">{{ tile.R.short }}</div>
      <div class="pc">{{ Math.round(tile.r.a * 100) }}%</div>
      <div class="bar"><i :style="{ width: tile.r.a * 100 + '%' }"></i></div>
      <div class="dcs" :class="tile.k">
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
        ><span>{{ tile.label }}</span>
      </div>
    </button>
  </section>
</template>
