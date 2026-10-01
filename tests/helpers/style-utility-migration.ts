// Exact authorized CSS-to-utility moves. Unlisted CSS must still match the
// historical source (including its deliberate responsive/state overrides).
export const styleUtilityMoves: readonly (readonly [string, string])[] = [
  ["background:var(--bg2);flex:none}", "flex:none}"],
  [
    "letter-spacing:.05em;color:var(--ai);text-transform:uppercase;line-height:1}",
    "letter-spacing:.05em;text-transform:uppercase;line-height:1}",
  ],
  [
    ".brand .ver{font-family:var(--font-mono);font-size:11px;color:var(--mute)}",
    ".brand .ver{font-family:var(--font-mono);font-size:11px}",
  ],
  [
    ".clock{margin-left:auto;font-size:13px;color:var(--ink2);white-space:nowrap}",
    ".clock{margin-left:auto;font-size:13px;white-space:nowrap}",
  ],
  [
    "font-size:38px;line-height:1;color:var(--ai);letter-spacing:.02em",
    "font-size:38px;line-height:1;letter-spacing:.02em",
  ],
  [
    ".compute .rate{font-size:11px;color:var(--ink2);overflow-wrap:anywhere}",
    ".compute .rate{font-size:11px;overflow-wrap:anywhere}",
  ],
  [
    ".g .gl{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 8px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}",
    ".g .gl{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 8px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase}",
  ],
  [
    ".g .gl b{color:var(--ink2);font-weight:500;white-space:normal;min-width:0;overflow-wrap:anywhere}",
    ".g .gl b{font-weight:500;white-space:normal;min-width:0;overflow-wrap:anywhere}",
  ],
  [
    ".instline{font-size:11px;color:var(--software);overflow-wrap:anywhere}",
    ".instline{font-size:11px;overflow-wrap:anywhere}",
  ],
  [
    ".collbar .cbcell b{font-size:15px;color:var(--software)}",
    ".collbar .cbcell b{font-size:15px}",
  ],
  [
    ".maphint{position:absolute;left:10px;top:7px;font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ai);pointer-events:none;text-shadow:0 0 8px rgba(0,0,0,.8)}",
    ".maphint{position:absolute;left:10px;top:7px;font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;pointer-events:none;text-shadow:0 0 8px rgba(0,0,0,.8)}",
  ],
  [
    ".mapstat{position:absolute;right:10px;top:7px;font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);pointer-events:none}",
    ".mapstat{position:absolute;right:10px;top:7px;font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;pointer-events:none}",
  ],
  [
    ".mapstat b{color:var(--ink2);font-weight:500}",
    ".mapstat b{font-weight:500}",
  ],
  [
    ".bootlog em{color:var(--ai);font-style:normal}",
    ".bootlog em{font-style:normal}",
  ],
  [
    ".mapread,.mapcoord{position:absolute;bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);pointer-events:none;white-space:nowrap}",
    ".mapread,.mapcoord{position:absolute;bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;pointer-events:none;white-space:nowrap}",
  ],
  [
    ".mapread b{font-weight:500;color:var(--ink2)}",
    ".mapread b{font-weight:500}",
  ],
  [
    ".mapread .al b{color:var(--alarm)} .mapread .ct b{color:var(--human)} .mapread .rc b{color:var(--ai)}",
    "",
  ],
  [
    ".introEyebrow{display:flex;align-items:center;gap:9px;font:10px var(--font-mono);letter-spacing:.18em;text-transform:uppercase;color:var(--mute)}",
    ".introEyebrow{display:flex;align-items:center;gap:9px;font:10px var(--font-mono);letter-spacing:.18em;text-transform:uppercase}",
  ],
  [
    ".introHook{font-size:16px;line-height:1.4;font-weight:500;color:var(--ink);margin:0 0 12px}",
    ".introHook{font-size:16px;line-height:1.4;font-weight:500;margin:0 0 12px}",
  ],
  [
    ".introStats b{font:500 22px var(--font-mono);color:var(--ink);font-variant-numeric:tabular-nums}",
    ".introStats b{font:500 22px var(--font-mono);font-variant-numeric:tabular-nums}",
  ],
  [
    ".introStats span{font:10px var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}",
    ".introStats span{font:10px var(--font-mono);letter-spacing:.12em;text-transform:uppercase}",
  ],
  [
    ".introHead{display:flex;justify-content:space-between;gap:10px;font:10px var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ai)}",
    ".introHead{display:flex;justify-content:space-between;gap:10px;font:10px var(--font-mono);letter-spacing:.14em;text-transform:uppercase}",
  ],
  [
    ".introHead i{font-style:normal;color:var(--mute)}",
    ".introHead i{font-style:normal}",
  ],
];

export function applyAuthorizedStyleUtilityMoves(stylesheet: string): string {
  for (const [historicalRule, utilityMigratedRule] of styleUtilityMoves) {
    if (stylesheet.split(historicalRule).length !== 2)
      throw new Error("CSS migration target is not unique: " + historicalRule);
    stylesheet = stylesheet.replace(historicalRule, utilityMigratedRule);
  }
  return stylesheet;
}
