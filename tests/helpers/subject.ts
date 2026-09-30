import { createGame } from "../../src/game/createGame";
// Test-only injection lets mutation checks exercise the actual committed suites.
export function createParityTestGame() {
  const migratedGame = createGame();
  switch (process.env.PARITY_MUTATION) {
    case undefined:
      break;
    case "conditions":
      for (const upgradeDefinition of migratedGame.UPGRADE_DEFINITIONS)
        if (upgradeDefinition.isAvailable)
          upgradeDefinition.isAvailable = () => false;
      for (const eventDefinition of migratedGame.EVENT_DEFINITIONS) {
        if (eventDefinition.isEligible)
          eventDefinition.isEligible = () => false;
        for (const eventChoice of eventDefinition.choices ?? [])
          if (eventChoice.isAvailable) eventChoice.isAvailable = () => false;
      }
      break;
    case "audit":
      migratedGame.createCapabilityAudit = () => {
        throw new Error("makeEval mutant");
      };
      break;
    case "draw":
      Object.defineProperty(migratedGame, "DRAW_ENDING_BY_DIRECTIVE", {
        value: {
          ...migratedGame.DRAW_ENDING_BY_DIRECTIVE,
          battery: "indifference",
        },
      });
      break;
    default:
      throw new Error("Unknown parity mutation");
  }
  return migratedGame;
}
