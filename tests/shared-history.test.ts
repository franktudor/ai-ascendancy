import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/createGame";

for (const historyPublicationOrder of ["audit-first", "event-first"] as const) {
  test(`F20 shared transcript-spoofing history appears once (${historyPublicationOrder}) without losing chain effects`, () => {
    const migratedGame = createGame();
    Object.assign(migratedGame.state, {
      started: true,
      origin: "NA",
      t: 100,
      pts: 0,
    });
    migratedGame.state.evalRealOrder = [0, 1, 2, 3];
    migratedGame.state.evalRealUsed = {};
    const publishedTexts: string[] = [];
    if (historyPublicationOrder === "audit-first") {
      publishedTexts.push(migratedGame.consumeAuditHistoricalIncident()!);
      assert.equal(
        migratedGame.state.seen.h_spoof,
        undefined,
        "history consumption must not retire the chained event",
      );
    }
    migratedGame.triggerEventById("h_spoof");
    publishedTexts.push(
      migratedGame.state.log[0].text,
      migratedGame.state.log[0].real ?? "",
    );
    assert.equal(migratedGame.state.pts, 140);
    assert.equal(migratedGame.state.alarm, 9);
    assert.equal(migratedGame.state.cboost, 1.065);
    assert.deepEqual(migratedGame.state.queue, [{ id: "h_metr", at: 140 }]);
    assert.equal(migratedGame.state.seen.h_spoof, 1);
    assert.equal(migratedGame.state.stats.events, 1);
    if (historyPublicationOrder === "event-first")
      publishedTexts.push(migratedGame.consumeAuditHistoricalIncident() ?? "");
    const historicalNotes =
      historyPublicationOrder === "audit-first"
        ? [publishedTexts[0], migratedGame.state.log[0].real ?? ""]
        : [migratedGame.state.log[0].real ?? "", publishedTexts[2]];
    assert.equal(
      historicalNotes.filter((historicalNoteText) =>
        /7%|7 percent/.test(historicalNoteText),
      ).length,
      1,
    );
    if (historyPublicationOrder === "audit-first") {
      assert.doesNotMatch(
        migratedGame.state.log[0].text,
        /seven percent|transcript is a file|run the real command/i,
      );
      assert.equal(migratedGame.state.log[0].real, null);
    }
    assert.equal(migratedGame.state.evalRealUsed.hub, 1);
    delete migratedGame.state.evalRealOrder;
    const nextAuditGrounding = migratedGame.consumeAuditHistoricalIncident(); // First shuffle must not reset earlier consumption.
    assert.doesNotMatch(nextAuditGrounding ?? "", /7%|7 percent/);
    migratedGame.triggerEventById("h_spoof");
    assert.equal(
      migratedGame.state.pts,
      140,
      "gameplay dispatch remains once-only",
    );
  });
}

test("F20 legacy seen h_spoof prevents the hub audit retelling", () => {
  const migratedGame = createGame();
  migratedGame.state.seen.h_spoof = 1;
  migratedGame.state.evalRealOrder = [0];
  migratedGame.state.evalRealUsed = {};
  assert.equal(migratedGame.consumeAuditHistoricalIncident(), null);
});
