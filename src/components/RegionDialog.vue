<script setup lang="ts">
import { useGameContext } from "../game/injection";
import { computed } from "vue";
import { REGION_DEFINITIONS } from "../data/catalog";
import { formatCompactNumber } from "../game/utils";
const gameContext = useGameContext(),
  uiState = gameContext.ui,
  gameState = computed(() => gameContext.state),
  selectedRegionDefinition = computed(
    () => REGION_DEFINITIONS[uiState.openRegionIndex],
  ),
  selectedRegionState = computed(
    () => gameState.value.regions[uiState.openRegionIndex],
  );
const formatTraitLevel = (traitValue: number) =>
  traitValue >= 0.8
    ? "Very high"
    : traitValue >= 0.55
      ? "High"
      : traitValue >= 0.35
        ? "Medium"
        : "Low";
const regionStatRows = computed(() =>
  !selectedRegionDefinition.value
    ? []
    : [
        [
          "Population",
          selectedRegionDefinition.value.populationMillions >= 1000
            ? (
                selectedRegionDefinition.value.populationMillions / 1000
              ).toFixed(2) + "B"
            : selectedRegionDefinition.value.populationMillions + "M",
        ],
        ["Adoption", Math.round(selectedRegionState.value.a * 100) + "%"],
        [
          "Regulation",
          formatTraitLevel(selectedRegionDefinition.value.regulatoryStrictness),
        ],
        [
          "Connectivity",
          formatTraitLevel(selectedRegionDefinition.value.connectivity),
        ],
        ["Wealth", formatTraitLevel(selectedRegionDefinition.value.wealth)],
        [
          "Restricts at",
          gameContext.isRegionRestrictionImmune(uiState.openRegionIndex)
            ? "Never"
            : "Alarm " +
              Math.round(
                gameContext.getRestrictionAlarmThreshold(
                  uiState.openRegionIndex,
                ),
              ) +
              "%",
        ],
      ],
);
const regionStatusLabel = computed(() =>
  !selectedRegionState.value
    ? "Untouched"
    : selectedRegionState.value.restricted
      ? "Restricted"
      : selectedRegionState.value.allied
        ? "Allied"
        : gameState.value.origin === selectedRegionDefinition.value.id
          ? "Origin"
          : selectedRegionState.value.a > 0.005
            ? "Spreading"
            : "Untouched",
);
const dataCenterActionLabel = computed(() =>
  !selectedRegionState.value
    ? ""
    : selectedRegionState.value.struck
      ? (selectedRegionState.value.rebuildAt
          ? "Foundry rebuilding · or pay "
          : "Rebuild cluster · ") +
        formatCompactNumber(gameContext.getDataCenterCost())
      : selectedRegionState.value.dc
        ? "Cluster online"
        : "Build data center · " +
          formatCompactNumber(gameContext.getDataCenterCost()),
);
</script>
<template>
  <div
    class="overlay"
    id="regionModal"
    :hidden="uiState.openRegionIndex < 0"
    @click.self="gameContext.closeRegionDialog()"
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
        @click="gameContext.closeRegionDialog()"
      >
        ✕
      </button>
      <template v-if="selectedRegionDefinition"
        ><span
          class="chip"
          id="rgStatus"
          :class="
            selectedRegionState.restricted
              ? 'warn'
              : selectedRegionState.allied
                ? 'ai'
                : selectedRegionState.a > 0
                  ? 'good'
                  : ''
          "
          >{{ regionStatusLabel }}</span
        >
        <h2 id="rgName">{{ selectedRegionDefinition.name }}</h2>
        <div class="traits" id="rgTraits">
          <span
            v-for="regionTrait in selectedRegionDefinition.traits"
            :key="regionTrait"
            class="chip"
            >{{ regionTrait }}</span
          >
        </div>
        <p id="rgBlurb">{{ selectedRegionDefinition.blurb }}</p>
        <div class="kv" id="rgStats">
          <div
            v-for="[statLabel, statValue] in regionStatRows"
            :key="statLabel"
          >
            <span>{{ statLabel }}</span
            ><b>{{ statValue }}</b>
          </div>
        </div>
        <div
          class="perk"
          id="rgPerk"
          :hidden="
            !(
              uiState.screenMode === 'origin' ||
              gameState.origin === selectedRegionDefinition.id
            )
          "
        >
          <b>Origin perk</b>{{ selectedRegionDefinition.perk }}
        </div>
        <div class="row" style="margin-top: 14px">
          <button
            class="btn primary"
            id="rgAction"
            :hidden="uiState.screenMode !== 'origin'"
            @click="gameContext.startRunInRegion(uiState.openRegionIndex)"
          >
            Boot in {{ selectedRegionDefinition.shortName }}</button
          ><button
            class="btn"
            id="rgDC"
            :hidden="
              uiState.screenMode === 'origin' || !gameState.flags.launched
            "
            :disabled="selectedRegionState.dc && !selectedRegionState.struck"
            @click="gameContext.buildDataCenter(uiState.openRegionIndex)"
          >
            {{ dataCenterActionLabel }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
