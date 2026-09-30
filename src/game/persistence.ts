import type { CompleteGameContext, GameState, EndingId } from "./types";
export function installPersistence(ctx: CompleteGameContext) {
  const storage = ctx.storage;
  ctx.CODEX_KEY = ctx.KEY + ".codex";
  ctx.codexGet = () => {
    try {
      return (
        (JSON.parse(storage?.getItem(ctx.CODEX_KEY) ?? "null") as Partial<
          Record<EndingId, number>
        > | null) || {}
      );
    } catch {
      return {};
    }
  };
  ctx.codexAdd = (k) => {
    try {
      const c = ctx.codexGet(),
        fresh = !c[k];
      c[k] = (c[k] || 0) + 1;
      storage?.setItem(ctx.CODEX_KEY, JSON.stringify(c));
      return fresh;
    } catch {
      return false;
    }
  };
  ctx.codexCount = () => ctx.END_ORDER.filter((k) => ctx.codexGet()[k]).length;
  ctx.save = () => {
    if (!ctx.state.started) return;
    const B = ctx.ui.brief,
      dec = ctx.state.brief.dec;
    if (B) ctx.state.brief.dec = B.decs.slice(B.done).concat(dec);
    try {
      ctx.state.savedAt = Date.now();
      storage?.setItem(ctx.KEY, JSON.stringify(ctx.state));
    } catch {
    } finally {
      ctx.state.brief.dec = dec;
    }
  };
  ctx.load = () => {
    try {
      const parsed: unknown = JSON.parse(storage?.getItem(ctx.KEY) ?? "null");
      if (
        parsed &&
        typeof parsed === "object" &&
        "v" in parsed &&
        (parsed.v === 2 || parsed.v === 3) &&
        "started" in parsed &&
        parsed.started
      ) {
        // Historical local saves use a shallow envelope check; preserve that exact
        // compatibility policy. Default merging below restores v3 missing fields.
        const s = parsed as GameState;
        const f = ctx.freshState(s.diff, s.arch);
        const restoreDefault = <K extends keyof GameState>(k: K) => {
          if (s[k] == null) s[k] = f[k];
        };
        for (const k of Object.keys(f) as (keyof GameState)[])
          restoreDefault(k);
        s.stats = Object.assign(f.stats, s.stats);
        for (const r of s.regions) r.holdUntil = r.holdUntil || 0;
        s.cboost = ctx.clamp(
          s.cboost,
          ctx.TUNING.cboostMin,
          ctx.TUNING.cboostMax,
        );
        s.v = 3;
        return s;
      }
    } catch {}
    return null;
  };
}
