<template>
  <div class="overlay" id="codexModal" hidden>
    <div
      class="modal menu"
      role="dialog"
      aria-modal="true"
      aria-labelledby="codexTitle"
    >
      <button class="ib x" id="codexClose" aria-label="Close">&#10005;</button>
      <span class="kind SYSTEM">Endings</span>
      <div id="codexRead" hidden>
        <h3 class="title" id="crTitle"></h3>
        <div class="dirline" id="crHint"></div>
        <div class="speech" id="crSpeech" hidden></div>
        <p id="crText"></p>
        <div class="row">
          <button class="btn" id="crBack">All endings</button>
        </div>
      </div>
      <div id="codexList">
        <h3 id="codexTitle">Sixteen ways this ends</h3>
        <p>
          Nine are victories, one for each Final Directive. Four are stalemates:
          humanity reaches 100% containment while your directive is past the
          violet line. Three are defeats. Fight like hell for the rest.
        </p>
        <div class="codex" id="codexFull"></div>
      </div>
    </div>
  </div>
</template>
