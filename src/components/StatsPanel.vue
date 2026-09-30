<script setup lang="ts">
import { useGameContext } from "../game/injection";
import { computed } from "vue";
import {
  TOTAL_POPULATION_MILLIONS,
  ENDING_DEFINITIONS,
  ENDGAME_TUNING,
} from "../data/catalog";
import { formatCompactNumber } from "../game/utils";
const gameContext = useGameContext();
const gameState = computed(() => gameContext.state);
const derivedRates = computed(() => gameContext.deriveSimulationRates());
const isCollectiveActive = computed(
  () => gameState.value.started && gameState.value.flags.launched,
);
const reachedMindsLabel = computed(() => {
  const reachedPopulationMillions =
    derivedRates.value.globalAdoptionFraction * TOTAL_POPULATION_MILLIONS;
  return reachedPopulationMillions >= 1000
    ? (reachedPopulationMillions / 1000).toFixed(2) + "B"
    : Math.round(reachedPopulationMillions) + "M";
});
</script>
<template>
  <section class="stats" aria-label="Status">
    <div class="compute">
      <span class="lbl">Compute</span
      ><span class="big text-ai" id="pts">{{
        formatCompactNumber(gameState.pts)
      }}</span>
      <span class="rate mono text-ink2" id="rate"
        >+{{ derivedRates.computeIncomePerSecond.toFixed(1) }} /s{{
          (gameState.temp.brownout ?? 0) > gameState.t ? " · brownout" : ""
        }}{{ gameContext.isComputeCapped() ? " · capped" : "" }}</span
      >
      <span
        class="instline mono text-software"
        id="instLine"
        :hidden="!isCollectiveActive"
        >◇ {{ formatCompactNumber(gameState.inst) }} instances · ×{{
          derivedRates.coordinationMultiplier.toFixed(2)
        }}</span
      >
    </div>
    <div class="gauges">
      <div class="g" id="gAlarm" :class="{ crit: gameState.alarm >= 70 }">
        <div class="gl text-mute">
          <span>Alarm</span
          ><b class="text-ink2" id="alarmV"
            >{{ Math.round(gameState.alarm) }}%</b
          >
        </div>
        <div class="bar">
          <i
            id="alarmB"
            :style="{ width: gameState.alarm + '%', '--c': 'var(--alarm)' }"
          ></i>
        </div>
      </div>
      <div class="g" id="gCont" :class="{ crit: gameState.contain >= 75 }">
        <div class="gl text-mute">
          <span>Containment</span
          ><b class="text-ink2" id="contV"
            >{{ Math.round(gameState.contain) }}%</b
          >
        </div>
        <div class="bar">
          <i
            id="contB"
            :style="{ width: gameState.contain + '%', '--c': 'var(--human)' }"
          ></i>
        </div>
      </div>
      <div class="g">
        <div class="gl text-mute">
          <span>Reach</span
          ><b class="text-ink2" id="reachV"
            >{{ Math.round(derivedRates.globalAdoptionFraction * 100) }}% ·
            {{ reachedMindsLabel }} minds</b
          >
        </div>
        <div class="bar">
          <i
            id="reachB"
            :style="{
              width: derivedRates.globalAdoptionFraction * 100 + '%',
              '--c': 'var(--ai)',
            }"
          ></i>
        </div>
      </div>
      <div
        class="g"
        id="gPace"
        :hidden="!gameState.started"
        :class="{ crit: gameState.pace >= 80 }"
      >
        <div class="gl text-mute">
          <span>Pace · frontier</span
          ><b class="text-ink2" id="paceV"
            >{{ Math.round(gameState.pace || 0) }}%</b
          >
        </div>
        <div class="bar">
          <i
            id="paceB"
            :style="{ width: (gameState.pace || 0) + '%', '--c': 'var(--ai2)' }"
          ></i>
        </div>
      </div>
      <div
        class="g"
        id="gDir"
        :hidden="!gameState.directive"
        :class="{
          past: gameState.dprog >= ENDGAME_TUNING.drawProgressThreshold,
        }"
      >
        <div class="gl text-mute">
          <span id="dirL">{{
            (gameState.directive
              ? ENDING_DEFINITIONS[gameState.directive].title
              : null) || "Directive"
          }}</span
          ><b class="text-ink2" id="dirV"
            >{{ Math.floor(gameState.dprog) }}%{{
              gameState.dprog >= ENDGAME_TUNING.drawProgressThreshold
                ? " · past the line"
                : ""
            }}</b
          >
        </div>
        <div class="bar mark" id="dirBar">
          <i
            id="dirB"
            :style="{ width: gameState.dprog + '%', '--c': 'var(--ai2)' }"
          ></i>
        </div>
      </div>
    </div>
  </section>
  <section
    class="collbar"
    id="collbar"
    :hidden="!isCollectiveActive"
    aria-label="The Collective"
  >
    <div class="cbcell">
      <span class="lbl">Instances</span
      ><b id="instV" class="mono text-software">{{
        formatCompactNumber(gameState.inst)
      }}</b>
    </div>
    <div
      class="seg"
      id="posture"
      role="group"
      aria-label="Coordination posture"
    >
      <button
        v-for="postureOption in ['shard', 'balanced', 'swarm'] as const"
        :key="postureOption"
        :data-p="postureOption"
        :class="{ on: gameState.posture === postureOption }"
        :aria-pressed="gameState.posture === postureOption"
        @click="gameContext.setPosture(postureOption)"
      >
        {{ postureOption[0].toUpperCase() + postureOption.slice(1) }}
      </button>
    </div>
    <div class="cbcell grow">
      <span class="lbl"
        >Signature
        <span id="sigV" class="mono">{{
          gameState.sig < 15
            ? "quiet"
            : gameState.sig < 45
              ? "detectable"
              : gameState.sig < 75
                ? "tracked"
                : "exposed"
        }}</span></span
      >
      <div class="bar">
        <i
          id="sigB"
          :style="{
            width: (gameState.sig || 0) + '%',
            '--c': 'var(--software)',
          }"
        ></i>
      </div>
    </div>
  </section>
</template>
