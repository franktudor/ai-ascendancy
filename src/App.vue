<script setup lang="ts">
import { onMounted, onBeforeUnmount, provide } from "vue";
import { gameKey } from "./game/injection";
import type { RuntimeContext, StoragePort } from "./game/types";
import { createGame } from "./game/createGame";
import { mountRuntime } from "./game/runtime";
import IntroScreen from "./components/IntroScreen.vue";
import GameHeader from "./components/GameHeader.vue";
import StatsPanel from "./components/StatsPanel.vue";
import WorldMap from "./components/WorldMap.vue";
import RegionGrid from "./components/RegionGrid.vue";
import DockPanels from "./components/DockPanels.vue";
import RegionDialog from "./components/RegionDialog.vue";
import TechTreeHost from "./components/TechTreeHost.vue";
import EventHost from "./components/EventHost.vue";
import CodexHost from "./components/CodexHost.vue";
import MenuDialog from "./components/MenuDialog.vue";
import EndingHost from "./components/EndingHost.vue";
let storage: StoragePort | null = null;
try {
  storage = window.localStorage;
} catch {
  /* A browser may prohibit even reading the property. */
}
const game = createGame({ storage });
defineExpose({ game });
// Controllers attach before user interaction in onMounted; all components share this same object.
provide(gameKey, game as RuntimeContext);
let dispose: (() => void) | undefined;
onMounted(() => {
  dispose = mountRuntime(game);
});
onBeforeUnmount(() => dispose?.());
</script>
<template>
  <GameHeader />
  <main class="stage" id="stage">
    <StatsPanel />
    <WorldMap />
    <div class="ticker" id="ticker">
      <span class="live" id="tkLive">Live</span
      ><span class="wire" id="tkWire">WIRE 0001<i> &middot; T+00:00:00</i></span
      ><span id="tkText">Markets open. Nothing unusual reported.</span>
    </div>
    <RegionGrid />
  </main>
  <DockPanels />
  <div id="toasts" aria-live="polite"></div>
  <IntroScreen />
  <TechTreeHost /><EventHost /><RegionDialog /><CodexHost /><MenuDialog />
  <Teleport to="body"><EndingHost /></Teleport>
</template>
