<script setup lang="ts">
import { useGame } from "../game/injection";
import { computed } from "vue";
import { MAP, REGIONS, RI } from "../data/catalog";
const game = useGame();
const state = computed(() => game.state);
const ui = game.ui;
const threat = computed(() => game.threat());
const coord = computed(() => {
  const i =
    ui.sel >= 0 ? ui.sel : state.value.origin ? RI[state.value.origin] : -1;
  return i >= 0
    ? (ui.sel >= 0 ? "Sel " : "Origin ") +
        REGIONS[i].id +
        " " +
        game.latLon(game.MAPD.cent[i])
    : "";
});
</script>
<template>
  <section
    class="mapwrap"
    :class="{ pick: ui.mode === 'origin' }"
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
        ui.mode === "origin" ? "Tap a region to boot your lab" : "Tap a region"
      }}
    </div>
    <div class="mapstat text-mute" id="mapstat">
      <span class="ms"
        >Status
        <b class="text-ink2">{{
          state.phase === 0
            ? "Contained"
            : state.phase === 1
              ? "Loose"
              : "Ascendant"
        }}</b>
        · </span
      >Threat <b class="text-ink2" :class="'t' + threat[0]">{{ threat[1] }}</b>
    </div>
    <div class="mapread text-mute" id="mapread" aria-hidden="true">
      <template v-if="state.started"
        ><span class="rc"
          >Reach
          <b class="text-ai">{{ Math.round(game.reach() * 100) }}%</b></span
        ><span class="al"
          >Alarm <b class="text-alarm">{{ Math.round(state.alarm) }}%</b></span
        ><span class="ct"
          >Contain
          <b class="text-human">{{ Math.round(state.contain) }}%</b></span
        ></template
      >
    </div>
    <div class="mapcoord text-mute" id="mapcoord" aria-hidden="true">
      {{ coord }}
    </div>
  </section>
</template>
