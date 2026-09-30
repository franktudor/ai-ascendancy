import { createGame } from "../../src/game/createGame";
// Test-only injection lets mutation checks exercise the actual committed suites.
export function subject() {
  const game = createGame();
  switch (process.env.PARITY_MUTATION) {
    case undefined:
      break;
    case "conditions":
      for (const u of game.UPGRADES) if (u.cond) u.cond = () => false;
      for (const e of game.EVENTS) {
        if (e.cond) e.cond = () => false;
        for (const c of e.choices ?? []) if (c.cond) c.cond = () => false;
      }
      break;
    case "audit":
      game.makeEval = () => {
        throw new Error("makeEval mutant");
      };
      break;
    case "draw":
      Object.defineProperty(game, "DRAWS", {
        value: { ...game.DRAWS, battery: "indifference" },
      });
      break;
    default:
      throw new Error("Unknown parity mutation");
  }
  return game;
}
