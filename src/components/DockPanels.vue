<script setup lang="ts">
import { useGameContext } from "../game/injection";
import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
import { REGION_DEFINITIONS } from "../data/catalog";
import { getRegionAccessibleLabel } from "../game/accessibility";
import { formatElapsedTime, getBulletinKindLabel } from "../game/utils";
import type { LogEntry } from "../game/types";
const gameContext = useGameContext(),
  uiState = gameContext.ui,
  gameState = computed(() => gameContext.state);
const affordableUpgradeCount = computed(
  () =>
    gameContext.UPGRADE_DEFINITIONS.filter(
      (upgradeDefinition) =>
        gameContext.getUpgradeStatus(upgradeDefinition) === "afford",
    ).length,
);
// Native details/focus state follows the entry, not its prepended array position.
// IDs stay local to this component so the historical save schema is unchanged.
const logEntryIds = new WeakMap<LogEntry, number>();
let nextLogEntryId = 0;
const getLogEntryId = (logEntry: LogEntry) => {
  let logEntryId = logEntryIds.get(logEntry);
  if (logEntryId === undefined) {
    logEntryId = nextLogEntryId++;
    logEntryIds.set(logEntry, logEntryId);
  }
  return logEntryId;
};
const activePanelTitle = computed(() =>
  uiState.activeDockTab === "world"
    ? uiState.screenMode === "origin"
      ? "Choose your origin"
      : "World"
    : "Log",
);
const activePanelDescription = computed(() =>
  uiState.activeDockTab === "world"
    ? uiState.screenMode === "origin"
      ? "Tap a region to see its perk and boot your lab there."
      : "Tap a region for details and data centers."
    : "Everything that happened, newest first.",
);
const isMobileViewport = ref(false);
const isDockPanelHidden = computed(
  () => isMobileViewport.value && !uiState.isDockPanelOpen,
);
let mobileViewportQuery: MediaQueryList | undefined;
const updateMobileViewportState = () => {
  isMobileViewport.value = mobileViewportQuery?.matches ?? false;
};
onMounted(() => {
  mobileViewportQuery = matchMedia("(max-width: 899px)");
  updateMobileViewportState();
  mobileViewportQuery.addEventListener("change", updateMobileViewportState);
});
onBeforeUnmount(() =>
  mobileViewportQuery?.removeEventListener("change", updateMobileViewportState),
);
watch(
  isDockPanelHidden,
  (isPanelHidden) => {
    if (
      isPanelHidden &&
      document.querySelector("#sheet")?.contains(document.activeElement)
    )
      document
        .querySelector<HTMLElement>(
          `#tabs [data-tab="${uiState.activeDockTab}"]`,
        )
        ?.focus();
  },
  { flush: "sync" },
);
</script>
<template>
  <aside class="dock">
    <nav class="tabs" id="tabs" aria-label="Panels">
      <button
        class="tab"
        data-tab="tree"
        aria-controls="treeModal"
        aria-haspopup="dialog"
        aria-expanded="false"
        style="--tc: var(--software)"
        @click="gameContext.openTechTree()"
      >
        <i class="dot"></i>Tree<span
          class="badge"
          :hidden="!affordableUpgradeCount || !gameState.started"
          >{{ affordableUpgradeCount }}</span
        >
      </button>
      <button
        class="tab"
        data-tab="world"
        aria-controls="sheet"
        :aria-expanded="uiState.activeDockTab === 'world' && !isDockPanelHidden"
        :class="{
          on: uiState.activeDockTab === 'world' && uiState.isDockPanelOpen,
        }"
        style="--tc: var(--ai)"
        @click="gameContext.openDockPanel('world')"
      >
        <i class="dot"></i>World<span class="badge" hidden></span>
      </button>
      <button
        class="tab"
        data-tab="log"
        aria-controls="sheet"
        :aria-expanded="uiState.activeDockTab === 'log' && !isDockPanelHidden"
        :class="{
          on: uiState.activeDockTab === 'log' && uiState.isDockPanelOpen,
        }"
        style="--tc: var(--human)"
        @click="gameContext.openDockPanel('log')"
      >
        <i class="dot"></i>Log<span class="badge" hidden></span>
      </button>
    </nav>
    <div
      class="sheet"
      id="sheet"
      :inert="isDockPanelHidden"
      :aria-hidden="isDockPanelHidden ? 'true' : undefined"
      :class="{
        open: uiState.isDockPanelOpen,
        origin:
          uiState.activeDockTab === 'world' && uiState.screenMode === 'origin',
      }"
      :style="{
        '--tc':
          uiState.activeDockTab === 'world' ? 'var(--ai)' : 'var(--human)',
      }"
    >
      <div class="sheetHead">
        <h2 id="sheetTitle">{{ activePanelTitle }}</h2>
        <p id="sheetSub">{{ activePanelDescription }}</p>
        <button
          class="ib"
          id="sheetClose"
          aria-label="Close panel"
          @click="gameContext.closeDockPanel()"
        >
          ✕
        </button>
      </div>
      <div class="sheetBody" id="sheetBody">
        <template v-if="uiState.activeDockTab === 'world'"
          ><button
            v-for="(regionDefinition, regionIndex) in REGION_DEFINITIONS"
            :key="regionDefinition.id"
            class="wr"
            :class="{ restricted: gameState.regions[regionIndex].restricted }"
            :data-i="regionIndex"
            :aria-label="getRegionAccessibleLabel(gameContext, regionIndex)"
            @click="gameContext.openRegionDialog(regionIndex)"
          >
            <span class="nm">{{ regionDefinition.name }}</span
            ><span class="pc"
              >{{ Math.round(gameState.regions[regionIndex].a * 100) }}%</span
            >
            <div class="bar">
              <i
                :style="{ width: gameState.regions[regionIndex].a * 100 + '%' }"
              ></i>
            </div>
            <div class="meta">
              <span
                >{{
                  regionDefinition.populationMillions >= 1000
                    ? (regionDefinition.populationMillions / 1000).toFixed(1) +
                      "B"
                    : regionDefinition.populationMillions + "M"
                }}
                people</span
              ><span>{{
                gameState.regions[regionIndex].restricted
                  ? "Restricted"
                  : gameState.regions[regionIndex].allied
                    ? "Allied"
                    : gameState.origin === regionDefinition.id
                      ? "Origin"
                      : "Tolerates alarm to " +
                        Math.round(
                          gameContext.getRestrictionAlarmThreshold(regionIndex),
                        ) +
                        "%"
              }}</span
              ><span v-if="gameState.regions[regionIndex].dc">{{
                gameState.regions[regionIndex].struck
                  ? "Cluster struck"
                  : "Cluster online"
              }}</span>
            </div>
            <div v-if="uiState.screenMode === 'origin'" class="perk">
              {{ regionDefinition.perk }}
            </div>
          </button></template
        >
        <template v-else-if="uiState.activeDockTab === 'log'"
          ><div
            v-for="logEntry in gameState.log"
            :key="getLogEntryId(logEntry)"
            class="le"
            :class="logEntry.kind"
          >
            <!-- prettier-ignore -->
            <div class="lt">T+{{ formatElapsedTime(logEntry.t) }} · {{ getBulletinKindLabel(logEntry.kind) }}</div>
            <b>{{ logEntry.title }}</b
            >{{ logEntry.text }}
            <div v-if="logEntry.out" class="out">{{ logEntry.out }}</div>
            <details v-if="logEntry.real">
              <summary>What actually happened</summary>
              <p>{{ logEntry.real }}</p>
            </details>
          </div>
          <div v-if="!gameState.log.length" class="empty">
            Nothing yet. Quiet is good. Quiet never lasts.
          </div></template
        >
      </div>
    </div>
  </aside>
</template>
