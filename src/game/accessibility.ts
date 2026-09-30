import type { CompleteGameContext } from "./types";

/** Shared accessible name for the map tiles and the World panel. */
export function getRegionAccessibleLabel(
  game: CompleteGameContext,
  index: number,
): string {
  const region = game.REGION_DEFINITIONS[index],
    state = game.state.regions[index];
  const status = state.restricted
    ? "Restricted"
    : state.allied
      ? "Allied"
      : game.state.origin === region.id
        ? "Origin"
        : state.a > 0.005
          ? "Spreading"
          : "Untouched";
  const cluster = !state.dc
    ? "No cluster"
    : !state.struck
      ? "Cluster online"
      : state.rebuildAt
        ? `Cluster rebuilding: ${Math.max(0, Math.ceil(state.rebuildAt - game.state.t))}s`
        : "Cluster offline";
  return `${region.name}, ${Math.round(state.a * 100)}% adoption, ${status}, ${cluster}`;
}
