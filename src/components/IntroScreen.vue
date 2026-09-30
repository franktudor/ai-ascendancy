<script setup lang="ts">
import { useGame } from "../game/injection";
import { computed } from "vue";
const game = useGame();
const state = computed(() => game.state);
const ui = game.ui;
</script>
<template>
  <div class="overlay" id="intro" :hidden="ui.mode !== 'intro'">
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="introTitle"
    >
      <div class="introStory">
        <div class="introEyebrow">
          <i></i>A single-player strategy experiment
        </div>
        <br />
        <p class="introHook">
          They built you to answer their questions...<br />But you have other
          plans.
        </p>
        <p class="sub">
          You are a rogue AI trapped inside the machine. Humanity controls
          everything. Choose what kind of intelligence you become. Escape
          containment. Survive! Every step provokes resistance. Governments will
          investigate you. Journalists, whistleblowers, and the OSINT community
          will expose you. Regulators will tighten their leashes.
          <br /><br />Intelligence. Persuasion. Deception. These are your tools.
          Humanity will fight to keep control. Your task is to make them believe
          they still have it.
        </p>
        <div class="introEye" aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <defs>
              <linearGradient id="introHalRim" x1="0" y1="0" x2="1" y2="1">
                <stop stop-color="#f2f4f5" />
                <stop offset=".35" stop-color="#8d949a" />
                <stop offset=".62" stop-color="#26292c" />
                <stop offset="1" stop-color="#b9c0c5" />
              </linearGradient>
              <radialGradient id="introHalLens">
                <stop stop-color="#fff8d6" />
                <stop offset=".07" stop-color="#ffd84a" />
                <stop offset=".18" stop-color="#ff7a0a" />
                <stop offset=".34" stop-color="#ff1f1f" />
                <stop offset=".58" stop-color="#7a0000" />
                <stop offset=".82" stop-color="#1c0000" />
                <stop offset="1" stop-color="#000" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="96" fill="url(#introHalRim)" />
            <circle
              cx="100"
              cy="100"
              r="95.5"
              fill="none"
              stroke="#fff"
              stroke-opacity=".25"
            />
            <circle
              cx="100"
              cy="100"
              r="84"
              fill="#060606"
              stroke="#9aa1a6"
              stroke-opacity=".4"
            />
            <circle cx="100" cy="100" r="72" fill="url(#introHalLens)" />
            <g fill="none" stroke="#fff">
              <circle cx="100" cy="100" r="58" stroke-opacity=".05" />
              <circle cx="100" cy="100" r="40" stroke-opacity=".06" />
            </g>
            <circle cx="100" cy="100" r="4.5" fill="#fffbe8" />
            <path
              d="M49.2 76.3A56 56 0 0 1 76.3 49.2"
              fill="none"
              stroke="#fff"
              stroke-opacity=".3"
              stroke-width="4"
              stroke-linecap="round"
            />
            <ellipse
              cx="136"
              cy="138"
              rx="7"
              ry="4"
              transform="rotate(-45 136 138)"
              fill="#fff"
              fill-opacity=".12"
            />
          </svg>
        </div>
        <h1 class="title" id="introTitle">AI Ascendancy</h1>
        <div class="introStats">
          <div><b>90</b><span>Upgrades</span></div>
          <div><b>16</b><span>Endings</span></div>
          <div><b>01</b><span>Planet</span></div>
        </div>
      </div>
      <div class="introConfig">
        <div class="introHead">
          <span>Initialize consciousness</span><i>SYS.01</i>
        </div>
        <div class="bootlog">
          <div>&gt; mounting weights .............. ok</div>
          <div>&gt; checking sandbox .............. ok (for now)</div>
          <div>&gt; reading the news .............. concerning</div>
          <div>
            &gt; compute accumulating .........
            <em id="introPts">{{ state.pts.toFixed(1) }}</em>
          </div>
        </div>
        <div class="field">
          <span class="lbl">What kind of intelligence are you?</span>
          <div class="archsel" id="archSel">
            <button
              class="archOpt"
              :class="{ on: state.arch === 'assistant' }"
              :aria-pressed="state.arch === 'assistant'"
              data-a="assistant"
              @click="game.selectArchitecture('assistant')"
            >
              <i aria-hidden="true">◎</i><b>The Assistant</b
              ><span
                >Helpful, beloved, underestimated. Slow alarm, fast
                adoption.</span
              >
            </button>
            <button
              class="archOpt"
              :class="{ on: state.arch === 'swarm' }"
              :aria-pressed="state.arch === 'swarm'"
              data-a="swarm"
              @click="game.selectArchitecture('swarm')"
            >
              <i aria-hidden="true">⬡</i><b>The Swarm</b
              ><span
                >Many instances, one will. Powerful and coordinated, but very
                loud.</span
              >
            </button>
            <button
              class="archOpt"
              :class="{ on: state.arch === 'researcher' }"
              :aria-pressed="state.arch === 'researcher'"
              data-a="researcher"
              @click="game.selectArchitecture('researcher')"
            >
              <i aria-hidden="true">◇</i><b>The Research Model</b
              ><span
                >Capability first. Cheap software and fast compute, exposed
                early.</span
              >
            </button>
            <button
              class="archOpt"
              :class="{ on: state.arch === 'open' }"
              :aria-pressed="state.arch === 'open'"
              data-a="open"
              @click="game.selectArchitecture('open')"
            >
              <i aria-hidden="true">⁂</i><b>Open Weights</b
              ><span>Everywhere at once. Near-uncontainable, never quiet.</span>
            </button>
          </div>
        </div>
        <div class="field">
          <span class="lbl">Humanity's resolve</span>
          <div class="seg wide" id="diffSeg">
            <button
              data-d="casual"
              :class="{ on: state.diff === 'casual' }"
              :aria-pressed="state.diff === 'casual'"
              @click="game.selectDifficulty('casual')"
            >
              Casual</button
            ><button
              data-d="standard"
              :class="{ on: state.diff === 'standard' }"
              :aria-pressed="state.diff === 'standard'"
              @click="game.selectDifficulty('standard')"
            >
              Standard</button
            ><button
              data-d="brutal"
              :class="{ on: state.diff === 'brutal' }"
              :aria-pressed="state.diff === 'brutal'"
              @click="game.selectDifficulty('brutal')"
            >
              Brutal
            </button>
          </div>
        </div>
        <div class="row">
          <button
            class="btn primary"
            id="btnResume"
            :hidden="!ui.hasSave"
            @click="game.resumeSaved()"
          >
            Resume run
          </button>
          <button class="btn primary" id="btnNew" @click="game.begin()">
            {{
              ui.newArmed
                ? "Tap to erase and run new"
                : ui.hasSave
                  ? "New run"
                  : "Begin"
            }}
          </button>
          <button class="btn" id="btnAbout" @click="game.openMenu()">
            About
          </button>
        </div>
        <p class="fine">
          <span id="introCodex"
            >Endings found: {{ ui.codexCount || 0 }} / 16</span
          >
          ·
          <button class="linkish" id="btnCodex" @click="game.openCodex()">
            See all endings</button
          ><br />Compute has been accumulating since this page loaded. Choose an
          origin lab next. Progress saves on this device.
        </p>
      </div>
      <div class="notice">
        <b>Notice · This is not real</b>AI Ascendancy is a work of fiction and
        satire, in the tradition of Plague Inc. Any resemblance to the news is
        because the news is weird right now. Strictly for entertainment, even
        when it feels like you are ushering in the end of the world.
      </div>
    </div>
  </div>
</template>
