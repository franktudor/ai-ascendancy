<template>
  <div
    class="tree"
    id="treeModal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="trTitle"
    hidden
  >
    <div class="trHead">
      <h2 id="trTitle">Tech tree</h2>
      <span class="trPts" id="trPts"></span>
      <div class="trTracks" id="trTracks"></div>
      <button
        class="trView"
        id="trView"
        aria-label="List view"
        aria-pressed="false"
        aria-controls="trList"
      >
        List view
      </button>
      <button class="ib" id="trClose" aria-label="Close tree">&#10005;</button>
      <div class="trGoal">
        <select id="trGoalSel" aria-label="Aim for an ending" hidden></select>
        <button
          class="trGoalBtn"
          id="trGoalBtn"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-controls="trGoalMenu"
        >
          <span>Aim for an ending…</span><i aria-hidden="true">&#9662;</i>
        </button>
        <div
          class="trGoalMenu"
          id="trGoalMenu"
          role="listbox"
          aria-label="Aim for an ending"
          hidden
        ></div>
        <span class="trGoalTx" id="trGoalTx"></span>
        <button class="ib" id="trGoalClear" aria-label="Clear goal" hidden>
          &#10005;
        </button>
      </div>
    </div>
    <div class="trStage" id="trStage">
      <canvas id="trCanvas" aria-hidden="true"></canvas>
      <div
        class="trList"
        id="trList"
        role="region"
        aria-label="Upgrades"
        hidden
      ></div>
      <div class="trHint">
        Drag to spin · tap a bubble · glowing = affordable
      </div>
      <div class="tscrim" id="tscrim" hidden></div>
      <div
        class="tcard"
        id="tcard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tcName"
        hidden
      >
        <button class="ib x" id="tcClose" aria-label="Close">&#10005;</button>
        <span class="chip" id="tcTrack"></span>
        <h3 id="tcName"></h3>
        <p id="tcDesc"></p>
        <div class="fx" id="tcFx"></div>
        <div class="tcReq" id="tcReq"></div>
        <div class="row tcFoot">
          <button class="btn primary" id="tcBuy">Buy</button
          ><button class="btn" id="tcPath">Trace path</button>
        </div>
      </div>
    </div>
  </div>
</template>
