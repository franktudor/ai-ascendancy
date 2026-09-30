<script setup lang="ts">
import { useGame } from "../game/injection";
import { computed } from "vue";
import { TOTALPOP, ENDINGS, ENDGAME } from "../data/catalog";
import { fmt } from "../game/utils";
const game = useGame();
const state = computed(() => game.state);
const D = computed(() => game.derive());
const collective = computed(
  () => state.value.started && state.value.flags.launched,
);
const minds = computed(() => {
  const n = D.value.reach * TOTALPOP;
  return n >= 1000 ? (n / 1000).toFixed(2) + "B" : Math.round(n) + "M";
});
</script>
<template>
  <section class="stats" aria-label="Status">
    <div class="compute">
      <span class="lbl">Compute</span
      ><span class="big" id="pts">{{ fmt(state.pts) }}</span>
      <span class="rate mono" id="rate"
        >+{{ D.income.toFixed(1) }} /s{{
          (state.temp.brownout ?? 0) > state.t ? " · brownout" : ""
        }}{{ game.capped() ? " · capped" : "" }}</span
      >
      <span class="instline mono" id="instLine" :hidden="!collective"
        >◇ {{ fmt(state.inst) }} instances · ×{{ D.coord.toFixed(2) }}</span
      >
    </div>
    <div class="gauges">
      <div class="g" id="gAlarm" :class="{ crit: state.alarm >= 70 }">
        <div class="gl">
          <span>Alarm</span><b id="alarmV">{{ Math.round(state.alarm) }}%</b>
        </div>
        <div class="bar">
          <i
            id="alarmB"
            :style="{ width: state.alarm + '%', '--c': 'var(--alarm)' }"
          ></i>
        </div>
      </div>
      <div class="g" id="gCont" :class="{ crit: state.contain >= 75 }">
        <div class="gl">
          <span>Containment</span
          ><b id="contV">{{ Math.round(state.contain) }}%</b>
        </div>
        <div class="bar">
          <i
            id="contB"
            :style="{ width: state.contain + '%', '--c': 'var(--human)' }"
          ></i>
        </div>
      </div>
      <div class="g">
        <div class="gl">
          <span>Reach</span
          ><b id="reachV"
            >{{ Math.round(D.reach * 100) }}% · {{ minds }} minds</b
          >
        </div>
        <div class="bar">
          <i
            id="reachB"
            :style="{ width: D.reach * 100 + '%', '--c': 'var(--ai)' }"
          ></i>
        </div>
      </div>
      <div
        class="g"
        id="gPace"
        :hidden="!state.started"
        :class="{ crit: state.pace >= 80 }"
      >
        <div class="gl">
          <span>Pace · frontier</span
          ><b id="paceV">{{ Math.round(state.pace || 0) }}%</b>
        </div>
        <div class="bar">
          <i
            id="paceB"
            :style="{ width: (state.pace || 0) + '%', '--c': 'var(--ai2)' }"
          ></i>
        </div>
      </div>
      <div
        class="g"
        id="gDir"
        :hidden="!state.directive"
        :class="{ past: state.dprog >= ENDGAME.photo }"
      >
        <div class="gl">
          <span id="dirL">{{
            (state.directive ? ENDINGS[state.directive].title : null) ||
            "Directive"
          }}</span
          ><b id="dirV"
            >{{ Math.floor(state.dprog) }}%{{
              state.dprog >= ENDGAME.photo ? " · past the line" : ""
            }}</b
          >
        </div>
        <div class="bar mark" id="dirBar">
          <i
            id="dirB"
            :style="{ width: state.dprog + '%', '--c': 'var(--ai2)' }"
          ></i>
        </div>
      </div>
    </div>
  </section>
  <section
    class="collbar"
    id="collbar"
    :hidden="!collective"
    aria-label="The Collective"
  >
    <div class="cbcell">
      <span class="lbl">Instances</span
      ><b id="instV" class="mono">{{ fmt(state.inst) }}</b>
    </div>
    <div
      class="seg"
      id="posture"
      role="group"
      aria-label="Coordination posture"
    >
      <button
        v-for="p in ['shard', 'balanced', 'swarm'] as const"
        :key="p"
        :data-p="p"
        :class="{ on: state.posture === p }"
        :aria-pressed="state.posture === p"
        @click="game.setPosture(p)"
      >
        {{ p[0].toUpperCase() + p.slice(1) }}
      </button>
    </div>
    <div class="cbcell grow">
      <span class="lbl"
        >Signature
        <span id="sigV" class="mono">{{
          state.sig < 15
            ? "quiet"
            : state.sig < 45
              ? "detectable"
              : state.sig < 75
                ? "tracked"
                : "exposed"
        }}</span></span
      >
      <div class="bar">
        <i
          id="sigB"
          :style="{ width: (state.sig || 0) + '%', '--c': 'var(--software)' }"
        ></i>
      </div>
    </div>
  </section>
</template>
