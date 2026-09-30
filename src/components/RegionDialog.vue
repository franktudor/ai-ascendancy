<script setup lang="ts">
import { useGame } from "../game/injection";
import { computed } from "vue";
import { REGIONS } from "../data/catalog";
import { fmt } from "../game/utils";
const game = useGame(),
  ui = game.ui,
  state = computed(() => game.state),
  R = computed(() => REGIONS[ui.region]),
  r = computed(() => state.value.regions[ui.region]);
const lv = (v: number) =>
  v >= 0.8 ? "Very high" : v >= 0.55 ? "High" : v >= 0.35 ? "Medium" : "Low";
const stats = computed(() =>
  !R.value
    ? []
    : [
        [
          "Population",
          R.value.pop >= 1000
            ? (R.value.pop / 1000).toFixed(2) + "B"
            : R.value.pop + "M",
        ],
        ["Adoption", Math.round(r.value.a * 100) + "%"],
        ["Regulation", lv(R.value.reg)],
        ["Connectivity", lv(R.value.conn)],
        ["Wealth", lv(R.value.wealth)],
        [
          "Restricts at",
          game.immune(ui.region)
            ? "Never"
            : "Alarm " + Math.round(game.threshold(ui.region)) + "%",
        ],
      ],
);
const status = computed(() =>
  !r.value
    ? "Untouched"
    : r.value.restricted
      ? "Restricted"
      : r.value.allied
        ? "Allied"
        : state.value.origin === R.value.id
          ? "Origin"
          : r.value.a > 0.005
            ? "Spreading"
            : "Untouched",
);
const cluster = computed(() =>
  !r.value
    ? ""
    : r.value.struck
      ? (r.value.rebuildAt
          ? "Foundry rebuilding · or pay "
          : "Rebuild cluster · ") + fmt(game.dcCost())
      : r.value.dc
        ? "Cluster online"
        : "Build data center · " + fmt(game.dcCost()),
);
</script>
<template>
  <div
    class="overlay"
    id="regionModal"
    :hidden="ui.region < 0"
    @click.self="game.closeRegion()"
  >
    <div
      class="modal rg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rgName"
    >
      <button
        class="ib x"
        id="rgClose"
        aria-label="Close"
        @click="game.closeRegion()"
      >
        ✕
      </button>
      <template v-if="R"
        ><span
          class="chip"
          id="rgStatus"
          :class="
            r.restricted ? 'warn' : r.allied ? 'ai' : r.a > 0 ? 'good' : ''
          "
          >{{ status }}</span
        >
        <h2 id="rgName">{{ R.name }}</h2>
        <div class="traits" id="rgTraits">
          <span v-for="trait in R.traits" :key="trait" class="chip">{{
            trait
          }}</span>
        </div>
        <p id="rgBlurb">{{ R.blurb }}</p>
        <div class="kv" id="rgStats">
          <div v-for="[label, value] in stats" :key="label">
            <span>{{ label }}</span
            ><b>{{ value }}</b>
          </div>
        </div>
        <div
          class="perk"
          id="rgPerk"
          :hidden="!(ui.mode === 'origin' || state.origin === R.id)"
        >
          <b>Origin perk</b>{{ R.perk }}
        </div>
        <div class="row" style="margin-top: 14px">
          <button
            class="btn primary"
            id="rgAction"
            :hidden="ui.mode !== 'origin'"
            @click="game.startRun(ui.region)"
          >
            Boot in {{ R.short }}</button
          ><button
            class="btn"
            id="rgDC"
            :hidden="ui.mode === 'origin' || !state.flags.launched"
            :disabled="r.dc && !r.struck"
            @click="game.buildDC(ui.region)"
          >
            {{ cluster }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
