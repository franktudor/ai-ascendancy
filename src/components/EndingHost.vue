<template>
  <canvas id="endFx" aria-hidden="true" hidden></canvas>
  <div class="endLog" id="endLog" aria-hidden="true" hidden></div>
  <button class="endSkip" id="endSkip" hidden>Skip</button>
  <div class="overlay" id="endModal" hidden>
    <div
      class="modal end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="endTitle"
    >
      <span class="kind" id="endKind">Run over</span>
      <h2 class="title" id="endTitle"></h2>
      <div class="dirline" id="endDir"></div>
      <div class="speech" id="endSpeech" hidden></div>
      <p id="endBody"></p>
      <div class="row" id="endNextRow">
        <button class="btn primary" id="btnEndNext">Continue</button>
      </div>
      <div id="endMore" hidden>
        <div class="endStats" id="endStats"></div>
        <div class="codex" id="endCodex"></div>
        <div class="row">
          <button class="btn primary" id="btnAgain">Run it back</button
          ><button class="btn" id="btnCopy">Copy report</button>
        </div>
        <pre class="report" id="endReport" hidden></pre>
        <div class="field">
          <span class="lbl">Make someone else deal with this</span>
          <div class="row">
            <a class="btn" id="shareX" target="_blank" rel="noopener"
              >Share on X</a
            >
            <a class="btn" id="shareReddit" target="_blank" rel="noopener"
              >Share on Reddit</a
            >
            <a class="btn" id="shareWA" target="_blank" rel="noopener"
              >WhatsApp</a
            >
            <button class="btn" id="shareCopyLink">Copy link</button>
          </div>
        </div>
        <p class="fine">
          Fiction. Satire. Not a plan. Thank you for playing responsibly.
        </p>
      </div>
    </div>
  </div>
</template>
