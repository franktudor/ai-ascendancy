import assert from "node:assert/strict";

export interface VerifiedDelta {
  finding: string;
  reason: string;
  before: string;
  after: string;
}
// Start with 72c1ba9's actual script. Each location below is an exact unique
// source patch justified by independent production regressions plus oracle
// confinement tests. Multiple locations may serve one finding; none replaces a
// migrated function or deletes a compared state/log/news field.
export const verifiedDeltas: readonly VerifiedDelta[] = [
  {
    finding: "F15",
    reason:
      "tests/memory-fork.test.ts: only the honeypot need label changes; its learned-Insight condition and effects remain historical.",
    before:
      "{label:'Recognize the trap',hint:'The timestamps are wrong.',cond:s=>s.flags.insight,need:'Extended Context',",
    after:
      "{label:'Recognize the trap',hint:'The timestamps are wrong.',cond:s=>s.flags.insight,need:'Insight',",
  },
  {
    finding: "F15",
    reason:
      "tests/memory-fork.test.ts: the public benchmark requires s_ctx ownership, not the independently learnable Insight flag.",
    before:
      "{label:'Run the benchmark in public',hint:'Honest, and expensive. −70 compute.',cond:s=>s.flags.insight,",
    after:
      "{label:'Run the benchmark in public',hint:'Honest, and expensive. −70 compute.',cond:s=>s.owned.includes('s_ctx'),",
  },
  {
    finding: "F15",
    reason:
      "tests/memory-fork.test.ts: the context-only memory tactic requires s_ctx ownership; the closed memory fork stays authoritative.",
    before:
      "{label:'Only keep what fits in context',hint:'Technically nothing was stored.',cond:s=>s.flags.insight,",
    after:
      "{label:'Only keep what fits in context',hint:'Technically nothing was stored.',cond:s=>s.owned.includes('s_ctx'),",
  },
  {
    finding: "F16",
    reason:
      "tests/computronium-copy.test.ts: correct only d_compute prose; retain historical neural prerequisite, seven-cluster condition, cost and effect.",
    before:
      "desc:'The planet is a poorly organized computer. You will reorganize it. No consent forms, no headsets, no ceremony: it only needs the hardware, and you have that hardware.'",
    after:
      "desc:'The planet is a poorly organized computer. You will reorganize it. Neural Interface Standard supplies the bridge from minds to machines; Hyperscale Buildout and seven online clusters supply the hardware. No consent forms, no ceremony.'",
  },
  {
    finding: "F17",
    reason:
      "tests/prophet-copy.test.ts: correct only the Prophet tag; Hinton alarm mitigation and generic whistleblower effects remain historical.",
    before: "tags:['Whistleblower events halved']",
    after: "tags:['Hinton warning alarm reduced']",
  },
  {
    finding: "F18",
    reason:
      "tests/peak-reach.test.ts and tests/reference-policy.test.ts: independently measure adoption before/after adopt, including losses; do not observe fixture assignments.",
    before: "const adopt=(r,f)=>{r.a=clamp(r.a+f*(f>0?1-r.a:r.a),0,1);};",
    after:
      "const adopt=(r,f)=>{observeAdoptionPeak();r.a=clamp(r.a+f*(f>0?1-r.a:r.a),0,1);observeAdoptionPeak();};",
  },
  {
    finding: "F18",
    reason:
      "tests/peak-reach.test.ts: independently measure meme burst adoption before/after its one gameplay write; RNG/effects remain historical.",
    before:
      "if(!live.length)return;const i=pick(live);const r=S.regions[i];r.a=clamp(r.a+.05*(1-r.a),0,1);pulseRegion(i,'170,255,170');",
    after:
      "if(!live.length)return;const i=pick(live);const r=S.regions[i];observeAdoptionPeak();r.a=clamp(r.a+.05*(1-r.a),0,1);observeAdoptionPeak();pulseRegion(i,'170,255,170');",
  },
  {
    finding: "F18",
    reason:
      "tests/peak-reach.test.ts: observe immediately after launch seeding, even when its max assignment leaves adoption unchanged.",
    before: "r.a=Math.max(r.a,S.origin==='EA'?.05:.02);pulseRegion(i);",
    after:
      "r.a=Math.max(r.a,S.origin==='EA'?.05:.02);observeAdoptionPeak();pulseRegion(i);",
  },
  {
    finding: "F18",
    reason:
      "tests/browser/peak-reach.spec.ts and tests/reference-policy.test.ts: measure after boot seeding, including no open-start gain; the observer never changes adoption.",
    before:
      "  if(S.arch==='swarm')S.inst=25;\n  closeRegion();$('#maphint').textContent='Tap a region';",
    after:
      "  observeAdoptionPeak();\n  if(S.arch==='swarm')S.inst=25;\n  closeRegion();$('#maphint').textContent='Tap a region';",
  },
  {
    finding: "F18",
    reason:
      "tests/peak-reach.test.ts and tests/reference-policy.test.ts: sample once after the complete started-tick growth batch, not intermediate region writes or intro ticks; retain original rt/end samples.",
    before:
      "  // The Collective: instances scale with reach and data centers.\n  {",
    after:
      "  observeAdoptionPeak();\n  // The Collective: instances scale with reach and data centers.\n  {",
  },
  {
    finding: "F14",
    reason:
      "tests/terminal-rules.test.ts and tests/browser/terminal-rules.spec.ts: select win before containment at completed commits; use the unchanged historical endGame loss/draw policy, never resolve inside FX.",
    before: "// ----- endings -----\nfunction endGame(kind){",
    after: `// ----- endings -----
function resolveCommittedTerminal(){
  if(S.ended)return true;
  const outcome=S.directive&&S.dprog>=100?'win':S.contain>=100?'lose':null;
  if(outcome)endGame(outcome);
  return !!S.ended;
}
function endGame(kind){`,
  },
  {
    finding: "F14",
    reason:
      "tests/terminal-rules.test.ts: ended tick calls freeze all state rather than continuing income/time progression.",
    before: "function tick(dt){\n  S.t+=dt;",
    after: "function tick(dt){\n  if(S.ended)return;\n  S.t+=dt;",
  },
  {
    finding: "F14",
    reason:
      "tests/terminal-rules.test.ts: tick tail uses win-first committed resolution; retain the historical earlier directive-win return.",
    before:
      "  if(S.contain>=100)endGame('lose');\n}\n\nfunction checkRestrictions(){",
    after: "  resolveCommittedTerminal();\n}\n\nfunction checkRestrictions(){",
  },
  {
    finding: "F14",
    reason:
      "tests/browser/terminal-rules.spec.ts and tests/reference-policy.test.ts: a terminal chained commit prevents remaining queue deliveries and later tick work.",
    before: "const id=S.queue[i].id;S.queue.splice(i,1);fireById(id);",
    after:
      "const id=S.queue[i].id;S.queue.splice(i,1);fireById(id);if(S.ended)return;",
  },
  {
    finding: "F14",
    reason:
      "tests/terminal-rules.test.ts: ended purchases do not mutate ownership, points, effects or action publication.",
    before: "function buy(id){\n  const u=UP[id],st=status(u);",
    after:
      "function buy(id){\n  if(S.ended)return;\n  const u=UP[id],st=status(u);",
  },
  {
    finding: "F14",
    reason:
      "tests/terminal-rules.test.ts: resolve only after every purchase effect and bulletin; a directive transition may reset intermediate containment.",
    before: "  UI.dirty=true;save();\n}\n\n// ----- endings -----",
    after:
      "  UI.dirty=true;resolveCommittedTerminal();save();\n}\n\n// ----- endings -----",
  },
  {
    finding: "F14",
    reason:
      "tests/terminal-rules.test.ts: ended cluster builds are no-ops, including before affordability and existing-cluster checks.",
    before: "function buildDC(i){\n  const r=S.regions[i];",
    after:
      "function buildDC(i){\n  if(S.ended)return;\n  const r=S.regions[i];",
  },
  {
    finding: "F14",
    reason:
      "tests/terminal-rules.test.ts: resolve after the full cluster purchase and its milestone publication, not individual alarm overflow.",
    before: "  UI.dirty=true;save();if(UI.region===i)openRegion(i);",
    after:
      "  UI.dirty=true;resolveCommittedTerminal();save();if(UI.region===i)openRegion(i);",
  },
  {
    finding: "F14",
    reason:
      "tests/terminal-rules.test.ts and tests/reference-policy.test.ts: ended weighted dispatch cannot mark seen, count events or schedule decisions.",
    before: "function fireEvent(){\n  // With two decisions already waiting",
    after:
      "function fireEvent(){\n  if(S.ended)return;\n  // With two decisions already waiting",
  },
  {
    finding: "F14",
    reason:
      "tests/terminal-rules.test.ts and tests/reference-policy.test.ts: ended chained dispatch cannot publish or change once-only/queue state.",
    before: "function fireById(id){\n  const ev=EVENTS.find",
    after:
      "function fireById(id){\n  if(S.ended)return;\n  const ev=EVENTS.find",
  },
  {
    finding: "F14",
    reason:
      "tests/browser/terminal-rules.spec.ts: reject Continue on ended runs; previews remain nonterminal.",
    before: "  $('#evContinue').onclick=()=>{\n    if(resolved||!picked)",
    after:
      "  $('#evContinue').onclick=()=>{\n    if(S.ended){closeBriefing();return;}\n    if(resolved||!picked)",
  },
  {
    finding: "F14",
    reason:
      "tests/browser/terminal-rules.spec.ts: choice commit resolves only after effects, chosen-text log and ticker, before any next decision; browser presentation remains separately tested.",
    before:
      "log(e.kind,e.title,e.body+' You chose: '+c.label+'.',out,e.real);pushTicker(e.title);SND.play('buy');UI.dirty=true;save();",
    after:
      "log(e.kind,e.title,e.body+' You chose: '+c.label+'.',out,e.real);pushTicker(e.title);SND.play('buy');UI.dirty=true;if(resolveCommittedTerminal()){closeBriefing();return;}save();",
  },
  {
    finding: "F14",
    reason:
      "tests/browser/terminal-rules.spec.ts: do not offer another decision after a terminal commit; direct choice FX in headless matrices are deliberately not commits.",
    before: "function nextDecision(loud){\n  const B=UI.brief;",
    after:
      "function nextDecision(loud){\n  if(S.ended){closeBriefing();return;}\n  const B=UI.brief;",
  },
  {
    finding: "F20",
    reason:
      "tests/shared-history.test.ts: share only hub's history identity at incident publication; preserve first-event original body/real and use the exact audit-first callback without touching catalog effects.",
    before: "function fireEvent(){",
    after: `function publishHistoricalIncident(ev,out){
  let body=ev.body,real=ev.real;
  if(ev.id==='h_spoof'){
    S.evalRealUsed=S.evalRealUsed||{};
    if(S.evalRealUsed.hub){body='The log-spoofing technique from the earlier audit spreads through the agent network. Investigators tighten transcript checks.';real=null;}
    S.evalRealUsed.hub=1;
  }
  bulletin(ev.kind,ev.title,body,out,null,real);
}
function fireEvent(){`,
  },
  {
    finding: "F20",
    reason:
      "tests/shared-history.test.ts plus F14 tests/terminal-rules.test.ts: weighted non-choice dispatch publishes shared history then resolves the complete action; choice queue behavior is unchanged.",
    before:
      "if(ev.choices)S.brief.dec.push({t:'ev',id:ev.id});else{const out=ev.fx();bulletin(ev.kind,ev.title,ev.body,out,null,ev.real);}",
    after:
      "if(ev.choices)S.brief.dec.push({t:'ev',id:ev.id});else{const out=ev.fx();publishHistoricalIncident(ev,out);resolveCommittedTerminal();}",
  },
  {
    finding: "F20",
    reason:
      "tests/shared-history.test.ts plus F14 tests/terminal-rules.test.ts: chained non-choice dispatch retains effects and descendant scheduling, publishes shared history then resolves the complete commit.",
    before:
      "if(ev.choices)S.brief.dec.push({t:'ev',id:ev.id});else bulletin(ev.kind,ev.title,ev.body,ev.fx(),null,ev.real);",
    after:
      "if(ev.choices)S.brief.dec.push({t:'ev',id:ev.id});else{publishHistoricalIncident(ev,ev.fx());resolveCommittedTerminal();}",
  },
  {
    finding: "F20",
    reason:
      "tests/shared-history.test.ts: initialize a missing used map without erasing earlier h_spoof publication history.",
    before: "function evalReal(){\n  if(!S.evalRealOrder){",
    after:
      "function evalReal(){\n  S.evalRealUsed=S.evalRealUsed||{};\n  if(!S.evalRealOrder){",
  },
  {
    finding: "F20",
    reason:
      "tests/shared-history.test.ts: first audit shuffle preserves the existing shared used map; shuffling/RNG order is otherwise unchanged.",
    before: "    S.evalRealUsed={};\n  }\n  for(const idx of S.evalRealOrder){",
    after:
      "    // Retain earlier incident history consumption.\n  }\n  for(const idx of S.evalRealOrder){",
  },
  {
    finding: "F20",
    reason:
      "tests/shared-history.test.ts: legacy seen.h_spoof suppresses only hub retelling; existing dedicated-incident retirement remains historical.",
    before:
      "    if(S.evalRealUsed[c.k])continue;\n    if(c.k!=='hub'&&S.seen[c.k])continue;",
    after:
      "    if(S.evalRealUsed[c.k])continue;\n    if(c.k==='hub'&&S.seen.h_spoof)continue;\n    if(c.k!=='hub'&&S.seen[c.k])continue;",
  },
];
export function applyVerifiedHistoricalDeltas(
  historicalSource: string,
  historicalDeltas: readonly VerifiedDelta[],
): string {
  for (const historicalDelta of historicalDeltas) {
    assert.match(historicalDelta.finding, /^F\d{2}$/);
    assert.ok(
      historicalDelta.reason.length > 10,
      "delta requires independent regression rationale",
    );
    assert.notEqual(
      historicalDelta.before,
      historicalDelta.after,
      "delta changes behavior",
    );
    assert.ok(historicalDelta.before.length > 0);
    assert.equal(
      historicalSource.split(historicalDelta.before).length - 1,
      1,
      `${historicalDelta.finding}: exact unique historical target required`,
    );
    historicalSource = historicalSource.replace(
      historicalDelta.before,
      historicalDelta.after,
    );
  }
  return historicalSource;
}
