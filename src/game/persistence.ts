import type { CompleteGameContext, EndingId } from "./types";
import { validateSave } from "./saveValidation";
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
      return validateSave(ctx, parsed);
    } catch {}
    return null;
  };
}
