export const clamp = (v: number, a: number, b: number) =>
    v < a ? a : v > b ? b : v,
  TAU = Math.PI * 2;
/** Callers guard dynamic pools before sampling; source catalogs are non-empty. */
export const pick = <T>(a: readonly T[]): T =>
  a[Math.floor(Math.random() * a.length)];
export const fmt = (n: number) => {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  if (n < 1e6) return (n / 1e3).toFixed(n < 1e4 ? 2 : 1) + "k";
  return (n / 1e6).toFixed(2) + "M";
};
export const fmtT = (s: number) => {
  s = Math.floor(s);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
};
const entities = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
} as const;
export const esc = (s: unknown) =>
  String(s).replace(/[&<>"]/g, (c) => entities[c as keyof typeof entities]);
export const kindLabel = (k: string) =>
  k === "SMOOTHING" ? "Brain smoothing" : k;
export const J = (...a: (string | number | boolean | null | undefined)[]) =>
  a.filter(Boolean).join(" · ");
export const sgn = (n: number) => (n > 0 ? "+" : "") + Math.round(n);
