<script setup lang="ts">
import { useGameContext } from "../game/injection";
import { computed } from "vue";
import { formatElapsedTime } from "../game/utils";
const gameContext = useGameContext();
const gameState = computed(() => gameContext.state);
const uiState = gameContext.ui;
</script>
<template>
  <header class="top bg-bg2">
    <div class="brand">
      <b class="text-ai">AI Ascendancy</b
      ><span class="ver mono text-mute" id="ver"
        >v{{ gameState.phase }}.{{ gameState.owned.length }}</span
      >
    </div>
    <div class="clock mono text-ink2" id="uptime" title="Game time">
      {{ formatElapsedTime(gameState.t) }}
    </div>
    <div class="ctl">
      <button
        class="ib"
        id="btnPause"
        :class="{ on: gameState.paused }"
        :aria-pressed="gameState.paused"
        @click="gameContext.togglePause()"
        aria-label="Pause or resume"
        title="Pause"
      >
        &#10074;&#10074;
      </button>
      <div class="seg" id="speed" role="group" aria-label="Game speed">
        <button
          data-s="1"
          :class="{ on: gameState.speed === 1 }"
          :aria-pressed="gameState.speed === 1"
          @click="gameContext.setSpeed(1)"
        >
          1×</button
        ><button
          data-s="2"
          :class="{ on: gameState.speed === 2 }"
          :aria-pressed="gameState.speed === 2"
          @click="gameContext.setSpeed(2)"
        >
          2×</button
        ><button
          data-s="3"
          :class="{ on: gameState.speed === 3 }"
          :aria-pressed="gameState.speed === 3"
          @click="gameContext.setSpeed(3)"
        >
          3×
        </button>
      </div>
      <button
        class="ib"
        id="btnSound"
        :class="{ on: uiState.isSoundEnabled }"
        :aria-pressed="uiState.isSoundEnabled"
        @click="gameContext.toggleSound()"
        aria-label="Toggle sound"
        title="Sound"
      >
        &#9834;
      </button>
      <button
        class="ib"
        id="btnMusic"
        :class="{ on: uiState.isMusicEnabled }"
        :aria-pressed="uiState.isMusicEnabled"
        @click="gameContext.toggleMusic()"
        aria-label="Toggle music"
        title="Music"
      >
        &#9835;
      </button>
      <button
        class="ib"
        id="btnMenu"
        @click="gameContext.openMenuDialog()"
        aria-label="Menu"
        title="Menu"
      >
        &#8801;
      </button>
    </div>
  </header>
</template>
