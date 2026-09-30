<script setup lang="ts">
import { useGame } from "../game/injection";
import { computed } from "vue";
import { REGIONS } from "../data/catalog";
import { fmtT, kindLabel } from "../game/utils";
import type { LogEntry } from "../game/types";
const game = useGame(),
  ui = game.ui,
  state = computed(() => game.state);
const ready = computed(
  () => game.UPGRADES.filter((u) => game.status(u) === "afford").length,
);
// Native details/focus state follows the entry, not its prepended array position.
// IDs stay local to this component so the historical save schema is unchanged.
const logIds = new WeakMap<LogEntry, number>();
let nextLogId = 0;
const logId = (entry: LogEntry) => {
  let id = logIds.get(entry);
  if (id === undefined) {
    id = nextLogId++;
    logIds.set(entry, id);
  }
  return id;
};
const title = computed(() =>
  ui.tab === "world"
    ? ui.mode === "origin"
      ? "Choose your origin"
      : "World"
    : "Log",
);
const sub = computed(() =>
  ui.tab === "world"
    ? ui.mode === "origin"
      ? "Tap a region to see its perk and boot your lab there."
      : "Tap a region for details and data centers."
    : "Everything that happened, newest first.",
);
</script>
<template>
  <aside class="dock">
    <nav class="tabs" id="tabs" aria-label="Panels">
      <button
        class="tab"
        data-tab="tree"
        style="--tc: var(--software)"
        @click="game.openTree()"
      >
        <i class="dot"></i>Tree<span
          class="badge"
          :hidden="!ready || !state.started"
          >{{ ready }}</span
        >
      </button>
      <button
        class="tab"
        data-tab="world"
        :class="{ on: ui.tab === 'world' && ui.sheetOpen }"
        style="--tc: var(--ai)"
        @click="game.openSheet('world')"
      >
        <i class="dot"></i>World<span class="badge" hidden></span>
      </button>
      <button
        class="tab"
        data-tab="log"
        :class="{ on: ui.tab === 'log' && ui.sheetOpen }"
        style="--tc: var(--human)"
        @click="game.openSheet('log')"
      >
        <i class="dot"></i>Log<span class="badge" hidden></span>
      </button>
    </nav>
    <div
      class="sheet"
      id="sheet"
      :class="{
        open: ui.sheetOpen,
        origin: ui.tab === 'world' && ui.mode === 'origin',
      }"
      :style="{ '--tc': ui.tab === 'world' ? 'var(--ai)' : 'var(--human)' }"
    >
      <div class="sheetHead">
        <h2 id="sheetTitle">{{ title }}</h2>
        <p id="sheetSub">{{ sub }}</p>
        <button
          class="ib"
          id="sheetClose"
          aria-label="Close panel"
          @click="game.closeSheet()"
        >
          ✕
        </button>
      </div>
      <div class="sheetBody" id="sheetBody">
        <template v-if="ui.tab === 'world'"
          ><button
            v-for="(R, i) in REGIONS"
            :key="R.id"
            class="wr"
            :class="{ restricted: state.regions[i].restricted }"
            :data-i="i"
            @click="game.openRegion(i)"
          >
            <span class="nm">{{ R.name }}</span
            ><span class="pc">{{ Math.round(state.regions[i].a * 100) }}%</span>
            <div class="bar">
              <i :style="{ width: state.regions[i].a * 100 + '%' }"></i>
            </div>
            <div class="meta">
              <span
                >{{
                  R.pop >= 1000 ? (R.pop / 1000).toFixed(1) + "B" : R.pop + "M"
                }}
                people</span
              ><span>{{
                state.regions[i].restricted
                  ? "Restricted"
                  : state.regions[i].allied
                    ? "Allied"
                    : state.origin === R.id
                      ? "Origin"
                      : "Tolerates alarm to " +
                        Math.round(game.threshold(i)) +
                        "%"
              }}</span
              ><span v-if="state.regions[i].dc">{{
                state.regions[i].struck ? "Cluster struck" : "Cluster online"
              }}</span>
            </div>
            <div v-if="ui.mode === 'origin'" class="perk">{{ R.perk }}</div>
          </button></template
        >
        <template v-else-if="ui.tab === 'log'"
          ><div
            v-for="e in state.log"
            :key="logId(e)"
            class="le"
            :class="e.kind"
          >
            <div class="lt">T+{{ fmtT(e.t) }} · {{ kindLabel(e.kind) }}</div>
            <b>{{ e.title }}</b
            >{{ e.text }}
            <div v-if="e.out" class="out">{{ e.out }}</div>
            <details v-if="e.real">
              <summary>What actually happened</summary>
              <p>{{ e.real }}</p>
            </details>
          </div>
          <div v-if="!state.log.length" class="empty">
            Nothing yet. Quiet is good. Quiet never lasts.
          </div></template
        >
      </div>
    </div>
  </aside>
</template>
