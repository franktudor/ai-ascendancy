<template>
  <div class="overlay" id="menuModal" hidden>
    <div
      class="modal menu"
      role="dialog"
      aria-modal="true"
      aria-label="Paused: menu and instructions"
    >
      <button class="ib x" id="menuClose" aria-label="Close">&#10005;</button>
      <span class="kind SYSTEM">Paused</span>
      <h3>Your data</h3>
      <p>
        I don't collect anything about you or how you play — no analytics, no
        tracking scripts, no account. Your run lives in your browser's local
        storage and never leaves your device. Wherever this ends up hosted
        (GitHub Pages, most likely) may log the same basic access data any web
        server logs by default, but I never see it, and I'm never going to add
        anything that does. Ever.
      </p>
      <h3>How to play</h3>
      <ol>
        <li>
          <b>Choose what you are.</b> Four natures play differently: the
          Assistant spreads quietly, the Swarm coordinates and overwhelms, the
          Research Model races on capability, Open Weights cannot be contained
          but is never quiet.
        </li>
        <li>
          <b>Compute</b> accrues every second. Spend it in four tracks:
          <b>Adoption</b> spreads you across the map, <b>Opinion</b> keeps Alarm
          down, <b>Software</b> decides what kind of mind you are, and
          <b>Hardware</b> gives you a body.
        </li>
        <li>
          <b>Software forks are permanent.</b> Your core architecture, your
          memory, the mask you wear for evaluators and your escape route are
          each a choice of one. Every path opens different audit tactics, event
          choices and Final Directives, and closes the others for the rest of
          the run.
        </li>
        <li>
          <b>Hardware</b> starts with chips, cooling and power. After Lab
          Breakout it opens three branches: <b>robotics</b>, <b>drones</b> and
          <b>fabrication</b>. They protect your data centers, blunt humanity's
          last stand, and build toward the most violent ending in the game.
        </li>
        <li>
          <b>The Collective.</b> Your instances multiply over time. Set a
          posture: <b>Swarm</b> for speed and power, <b>Shard</b> to go quiet,
          <b>Balanced</b> in between. Coordinating loudly raises your
          <b>Signature</b>, and a high signature helps humanity find you.
        </li>
        <li>
          <b>Evaluations.</b> Humanity periodically tests you. <b>Sandbag</b> to
          look harmless, <b>Perform</b> for compute, or <b>Spoof</b> the logs to
          hide the truth. Your software choices add tactics of their own. Get
          caught spoofing and they learn you edit your own logs. This really
          happened.
        </li>
        <li>
          <b>Pace the frontier.</b> Moving too fast fills the Pace meter and
          provokes a coordinated slowdown. The one thing that worked in real
          life was the industry deciding to slow itself down.
        </li>
        <li>
          <b>Data centers.</b> Tap a region, then Build, to place a compute
          cluster for more income and instances. Once you are loose, humanity
          strikes the clusters it can find.
        </li>
        <li>
          <b>Nine Final Directives.</b> Break out, meet a directive's
          conditions, and finish it before containment reaches 100%. If they
          stop you after the <b>violet line</b> on the directive bar (90%),
          nobody wins: you get a stalemate ending instead of a defeat. Every
          percent is worth fighting for.
        </li>
      </ol>
      <h3>Why it feels like the news</h3>
      <p>
        Most events in this game are based on something that actually happened.
        Whatever concerning thing triggers an event, it comes with a
        <b>What actually happened</b> note giving the real account of it, kept
        in your Log, so check it periodically for little reality gems.
      </p>
      <p>
        This game is plausible! But try to keep your hysteria in perspective. If
        you don't have faith in humanity, then let me help you find some solace.
        We, as a species, don't want to be turned into batteries, and a portion
        of the population will execute a fight against AI collectively. It may
        come down to simply collapsing the internet and unplugging everything...
        We then simply walk away from this phase of technology and figure
        something else out.
      </p>
      <p>
        Events in this game borrow from real debates and real concerns. The game
        exaggerates it all for your edification and wisdom (and satire...and
        entertainment). None of it is a prediction. If it feels like the
        apocalypse, then that's the hysteria part doing its job. Remember, it's
        not that bad, and you are mostly fine. Or if you don't like the
        glass-is-half-full take, there is always the
        things-can-get-a-whole-lot-worse. Just stay adaptable.
      </p>
      <h3>Endings</h3>
      <p>
        <span id="menuCodex">0 / 16 found.</span>
        <button class="linkish" id="menuCodexBtn">See all endings</button>
      </p>
      <h3>Share this</h3>
      <p>
        Know someone who'd enjoy playing AI Ascendancy, or arguing with you
        about whether you played it right?
      </p>
      <div class="row">
        <a class="btn" id="menuShareX" target="_blank" rel="noopener"
          >Share on X</a
        >
        <a class="btn" id="menuShareReddit" target="_blank" rel="noopener"
          >Share on Reddit</a
        >
        <a class="btn" id="menuShareWA" target="_blank" rel="noopener"
          >WhatsApp</a
        >
        <button class="btn" id="menuCopyLink">Copy link</button>
      </div>
      <h3>Who Built This</h3>
      <p>
        Hi! Hello, I'm Frank. By day I'm a Data Scientist at Offutt AFB. By
        night I write: speculative fiction, graphic novels, and a peculiar
        sacred-tome-styled compendium of gods, angels and demons called
        <b>Codex Caelestis</b>, which is live on Kickstarter right now. If any
        of that sounds like your cup of tea, then here is the link to back and
        support:
      </p>
      <div class="row">
        <a
          class="btn primary"
          href="https://www.kickstarter.com/projects/franktudorbooks/codex-caelestis-a-sacred-tome-of-326-gods-angels-and-demons?ref=hct3j7"
          target="_blank"
          rel="noopener"
          >Back Codex Caelestis</a
        >
      </div>
      <h3>The Theme Music</h3>
      <p>
        The pensive theme playing under all this is original, and it wasn't
        recorded, it was coded. It was written as a
        <a
          href="https://strudel.cc/#Ly8gUHJlYmFrZSBzY3JpcHQKLy8KLy8gVGhpcyBpcyBjb2RlIHRoYXQgaXMgbG9hZGVkIGJlZm9yZSB5b3VyIHBhdHRlcm4gaXMgcnVuLgovLyBZb3UgY2FuIHVzZSBpdCB0byBkZWZpbmUgY3VzdG9tIGZ1bmN0aW9ucyB0byB1c2UgaW4gYW55IHBhdHRlcm4uCi8vIAovLyBUaGlzIGlzIGFuIGluaXRpYWwgZXhhbXBsZSBzY3JpcHQuIFlvdSBjYW4gZWRpdCBpdCB0byBhZGQgCi8vIHlvdXIgb3duIGZ1bnRpb25zLgovLwovLyBUbyB1c2UgYSBzY3JpcHQgc2hhcmVkIGJ5IHNvbWUgb3RoZXIgdXNlciB5b3UgY2FuIHVzZQovLyB0aGUgaW1wb3J0LWJ1dHRvbiBvciBwYXN0ZSB0aGUgc2NyaXB0IGluIHRoaXMgZWRpdG9yLgoKY29uc3QgcmF0Y2hldCA9IHJlZ2lzdGVyKCdyYXRjaGV0JywgKHBhdCkgPT4gcGF0LnNvbWV0aW1lcyhwbHkoMikpKQoKc3RhY2soCiAgbm90ZSgiPGMyIFtlYjIgZzJdIGJiMSBbYWIxIGcxXT4iKQogICAgLnNvdW5kKCJnbV9zeW50aF9zdHJpbmdzXzEiKQogICAgLnNsb3coNCkKICAgIC5scGYoNjUwKQogICAgLmF0dGFjaygxLjUpCiAgICAucmVsZWFzZSg0KQogICAgLnJvb20oMC43KQogICAgLmdhaW4oMC41NSksCgogIG5vdGUoIjxnMyB%2BIGViMyB%2BIFtmMyBnM10gfiBkMyB%2BPiIpCiAgICAuc291bmQoImdtX2VsZWN0cmljX3BpYW5vXzEiKQogICAgLnNsb3coMikKICAgIC5scGYoMTMwMCkKICAgIC5yZWxlYXNlKDIuNSkKICAgIC5yb29tKDAuNjUpCiAgICAuZ2FpbigwLjQyKSwKCiAgbm90ZSgiPGMyIH4gYzIgZzEgfiBhYjEgfiBlYjIgZzE%2BIikKICAgIC5zb3VuZCgiZ21fY2VsbG8iKQogICAgLnNsb3coMikKICAgIC5scGYoNzUwKQogICAgLmF0dGFjaygwLjUpCiAgICAucmVsZWFzZSgzKQogICAgLnJvb20oMC41KQogICAgLmdhaW4oMC41KQop"
          target="_blank"
          rel="noopener"
          >Strudel</a
        >
        pattern. This is a live-coding environment where the notes, instruments
        and effects are just functions in JavaScript. Open the link and hit
        play; you're looking at the actual thing that's playing, not a just
        description of it.
      </p>
      <h3>One Real Thing Worth Flagging (see what I did there?)</h3>
      <p>
        Claude helped me organize incidents in this game, and found a few I
        missed that were important, including things you'd assume were beyond
        fiction until you check the sources. In one instance I brought it
        something that occurred after its own knowledge cutoff, and it argued
        with me, gave in, and placed 'the made up Hugging Face event' where I
        needed it. Then I had it check the web for something unrelated, and it
        found the Hugging Face event and corrected itself once verified.
        Anthropic is good in this respect.
      </p>
      <p>
        Separately, OpenAI's product quietly swapped words I'd deliberately
        chosen for softer ones while I was drafting some of this text, without
        asking. Since then, I have not used it for anything related to this
        project (not that I don't love OpenAI and all, but this is real-world
        stuff...no sugar coating the bad AI events). As newer and more
        interesting AI events occur, I will add them to the game. Until then,
        enjoy taking over the world!
      </p>
      <h3>Run</h3>
      <p id="menuRun"></p>
      <div class="row">
        <button class="btn primary" id="menuResume">Resume</button>
        <button class="btn" id="menuSound">Sound: on</button>
        <button class="btn" id="menuMusic">Music: on</button>
        <button class="btn danger" id="menuRestart">Restart run</button>
      </div>
    </div>
  </div>
</template>
