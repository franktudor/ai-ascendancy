<script setup lang="ts">
import { useGame } from "../game/injection";
import { computed } from "vue";
import { fmtT } from "../game/utils";
const game = useGame();
const state = computed(() => game.state);
const ui = game.ui;
</script>
<template>
  <header class="top">
    <div class="brand">
      <b>AI Ascendancy</b
      ><span class="ver mono" id="ver"
        >v{{ state.phase }}.{{ state.owned.length }}</span
      >
    </div>
    <div class="clock mono" id="uptime" title="Game time">
      {{ fmtT(state.t) }}
    </div>
    <div class="ctl">
      <button
        class="ib"
        id="btnPause"
        :class="{ on: state.paused }"
        :aria-pressed="state.paused"
        @click="game.togglePause()"
        aria-label="Pause or resume"
        title="Pause"
      >
        &#10074;&#10074;
      </button>
      <div class="seg" id="speed" role="group" aria-label="Game speed">
        <button
          data-s="1"
          :class="{ on: state.speed === 1 }"
          :aria-pressed="state.speed === 1"
          @click="game.setSpeed(1)"
        >
          1×</button
        ><button
          data-s="2"
          :class="{ on: state.speed === 2 }"
          :aria-pressed="state.speed === 2"
          @click="game.setSpeed(2)"
        >
          2×</button
        ><button
          data-s="3"
          :class="{ on: state.speed === 3 }"
          :aria-pressed="state.speed === 3"
          @click="game.setSpeed(3)"
        >
          3×
        </button>
      </div>
      <button
        class="ib"
        id="btnSound"
        :class="{ on: ui.soundOn }"
        :aria-pressed="ui.soundOn"
        @click="game.toggleSound()"
        aria-label="Toggle sound"
        title="Sound"
      >
        &#9834;
      </button>
      <button
        class="ib"
        id="btnMusic"
        :class="{ on: ui.musicOn }"
        :aria-pressed="ui.musicOn"
        @click="game.toggleMusic()"
        aria-label="Toggle music"
        title="Music"
      >
        &#9835;
      </button>
      <button
        class="ib"
        id="btnMenu"
        @click="game.openMenu()"
        aria-label="Menu"
        title="Menu"
      >
        &#8801;
      </button>
    </div>
  </header>
</template>
