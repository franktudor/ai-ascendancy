<template>
  <div class="overlay" id="eventModal" hidden>
    <div
      class="modal ev"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evTitle"
    >
      <span class="evTime mono" id="evTime"></span>
      <span class="kind" id="evKind">Incident</span>
      <h2 id="evTitle"></h2>
      <p id="evBody"></p>
      <ul class="evNews" id="evNews" hidden></ul>
      <div class="realbox" id="evReal" hidden>
        <b>What actually happened</b><span id="evRealTx"></span>
      </div>
      <div class="choices" id="evChoices"></div>
      <div class="outcome" id="evOutcome" hidden></div>
      <div class="row" style="margin-top: 14px">
        <button class="btn primary" id="evContinue" hidden>Continue</button
        ><button class="btn" id="evBack" hidden>Back</button>
      </div>
    </div>
  </div>
</template>
