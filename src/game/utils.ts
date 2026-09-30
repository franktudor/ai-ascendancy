export const clamp = (value: number, minimum: number, maximum: number) =>
    value < minimum ? minimum : value > maximum ? maximum : value,
  FULL_TURN_RADIANS = Math.PI * 2;
/** Callers guard dynamic pools before sampling; source catalogs are non-empty. */
export const pickRandomItem = <Item>(items: readonly Item[]): Item =>
  items[Math.floor(Math.random() * items.length)];
export const formatCompactNumber = (value: number) => {
  value = Math.floor(value);
  if (value < 1000) return String(value);
  if (value < 1e6) return (value / 1e3).toFixed(value < 1e4 ? 2 : 1) + "k";
  return (value / 1e6).toFixed(2) + "M";
};
export const formatElapsedTime = (elapsedSeconds: number) => {
  elapsedSeconds = Math.floor(elapsedSeconds);
  return [
    Math.floor(elapsedSeconds / 3600),
    Math.floor((elapsedSeconds % 3600) / 60),
    elapsedSeconds % 60,
  ]
    .map((timeComponent) => String(timeComponent).padStart(2, "0"))
    .join(":");
};
const HTML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
} as const;
export const escapeHtml = (value: unknown) =>
  String(value).replace(
    /[&<>"]/g,
    (character) => HTML_ENTITIES[character as keyof typeof HTML_ENTITIES],
  );
export const getBulletinKindLabel = (bulletinKind: string) =>
  bulletinKind === "SMOOTHING" ? "Brain smoothing" : bulletinKind;
export const joinDetailLabels = (
  ...labels: (string | number | boolean | null | undefined)[]
) => labels.filter(Boolean).join(" · ");
export const formatSignedInteger = (value: number) =>
  (value > 0 ? "+" : "") + Math.round(value);
