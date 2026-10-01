import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";
import { installEventController } from "../src/game/eventController";
import type { RuntimeContext } from "../src/game/types";

// This public contract intentionally precedes the shared implementation.
test("shared public API uses descriptive catalogs, rules and effects", () => {
  const migratedGame = createGame();
  assert.ok(
    "UPGRADE_DEFINITIONS" in migratedGame,
    "upgrade definitions have their canonical public name",
  );
  assert.ok(
    "UPGRADE_BY_ID" in migratedGame,
    "upgrade lookup has its canonical public name",
  );
  assert.ok(
    "getUpgradeCost" in migratedGame,
    "upgrade cost query has its canonical public name",
  );
  assert.ok(
    "purchaseUpgrade" in migratedGame,
    "upgrade purchase has its canonical public name",
  );
  assert.ok(
    "advanceSimulation" in migratedGame,
    "simulation advancement has its canonical public name",
  );
  assert.ok(
    "effects" in migratedGame,
    "state-changing effects have their canonical public name",
  );
  const gameApi = migratedGame;
  assert.equal(gameApi.UPGRADE_DEFINITIONS.length, 90);
  assert.equal(gameApi.UPGRADE_BY_ID.s_inf.id, "s_inf");
  assert.equal(gameApi.getUpgradeCost(gameApi.UPGRADE_BY_ID.s_inf), 10);
  const computeBeforeEffect = migratedGame.state.pts;
  assert.equal(gameApi.effects.adjustCompute(7), "Compute +7");
  assert.equal(migratedGame.state.pts, computeBeforeEffect + 7);
  assert.equal(
    "pts" in migratedGame.state,
    true,
    "the saved compute key is retained",
  );
  assert.equal(
    "a" in migratedGame.state.regions[0],
    true,
    "the saved adoption key is retained",
  );
});

class ChoiceElement {
  hidden = false;
  disabled = false;
  className = "";
  textContent = "";
  innerHTML = "";
  children: ChoiceElement[] = [];
  onclick: (() => void) | null = null;
  classList = { toggle() {} };
  appendChild(childChoiceElement: ChoiceElement) {
    this.children.push(childChoiceElement);
  }
  setAttribute() {}
}

test("choice affordability recognizes effects.adjustCompute literal costs and retains the all-poor escape", () => {
  const migratedGame = createGame() as RuntimeContext;
  installEventController(migratedGame);
  const choiceElementsBySelector = new Map<string, ChoiceElement>();
  const getChoiceElement = (elementSelector: string) => {
    let choiceElement = choiceElementsBySelector.get(elementSelector);
    if (!choiceElement) {
      choiceElement = new ChoiceElement();
      choiceElementsBySelector.set(elementSelector, choiceElement);
    }
    return choiceElement;
  };
  migratedGame.requireElement = ((elementSelector: string) =>
    getChoiceElement(elementSelector)) as RuntimeContext["requireElement"];
  const previousDocument = globalThis.document;
  const previousNavigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  globalThis.document = {
    createElement: () => new ChoiceElement(),
  } as unknown as Document;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {},
  });
  try {
    migratedGame.state.pts = 0;
    const gameApi = migratedGame;
    gameApi.showEvent({
      kind: "SYSTEM",
      title: "Affordability",
      body: "",
      choices: [
        {
          label: "Paid",
          hint: "",
          applyEffects: () => gameApi.effects.adjustCompute(-20),
        },
        { label: "Free", hint: "", applyEffects: () => "Nothing changes." },
      ],
    });
    const choiceButtons = getChoiceElement("#evChoices").children;
    assert.equal(
      choiceButtons[0].disabled,
      true,
      "an unaffordable paid choice stays locked after the effect rename",
    );
    assert.match(choiceButtons[0].innerHTML, /Needs 20 compute/);
    assert.equal(choiceButtons[1].disabled, false);
    choiceButtons.length = 0;
    gameApi.showEvent({
      kind: "SYSTEM",
      title: "Escape",
      body: "",
      choices: [
        {
          label: "Paid",
          hint: "",
          applyEffects: () => gameApi.effects.adjustCompute(-20),
        },
      ],
    });
    assert.equal(
      choiceButtons[0].disabled,
      false,
      "an event never traps the player when every choice is poor",
    );
  } finally {
    globalThis.document = previousDocument;
    if (previousNavigatorDescriptor)
      Object.defineProperty(
        globalThis,
        "navigator",
        previousNavigatorDescriptor,
      );
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});
