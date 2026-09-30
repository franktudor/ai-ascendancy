import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import virtualMachine from "node:vm";
import { parse } from "@vue/compiler-sfc";
import { compile } from "@vue/compiler-dom";
import * as Vue from "vue";
import { formatElapsedTime, getBulletinKindLabel } from "../src/game/utils";
import type { LogEntry } from "../src/game/types";

function renderLogTimestampTexts(componentSource: string): string[] {
  const { descriptor, errors } = parse(componentSource);
  assert.deepEqual(errors, []);
  assert.ok(descriptor.template);
  const { code } = compile(descriptor.template.content, { mode: "function" });
  const renderValue: unknown = virtualMachine.runInNewContext(
    `(function () { ${code} })()`,
    { Vue },
  );
  assert.equal(typeof renderValue, "function");
  const render = renderValue as (context: object, cache: unknown[]) => unknown;
  const logEntries: LogEntry[] = [
    { t: 0, kind: "HEADLINE", title: "First", text: "First body" },
    { t: 61.5, kind: "COUNTERMOVE", title: "Second", text: "Second body" },
    { t: 3600, kind: "MILESTONE", title: "Third", text: "Third body" },
  ];
  const uiState = {
    activeDockTab: "log",
    screenMode: "play",
    isDockPanelOpen: true,
    tab: "log",
    mode: "play",
    sheetOpen: true,
  };
  const gameState = { started: true, log: logEntries };
  const renderedTree = render(
    {
      gameContext: {},
      game: {},
      uiState,
      ui: uiState,
      gameState,
      state: gameState,
      affordableUpgradeCount: 0,
      ready: 0,
      isDockPanelHidden: false,
      sheetHidden: false,
      activePanelTitle: "Log",
      title: "Log",
      activePanelDescription: "Everything that happened, newest first.",
      sub: "Everything that happened, newest first.",
      getLogEntryId: (entry: LogEntry) => logEntries.indexOf(entry),
      logId: (entry: LogEntry) => logEntries.indexOf(entry),
      formatElapsedTime,
      fmtT: formatElapsedTime,
      getBulletinKindLabel,
      kindLabel: getBulletinKindLabel,
    },
    [],
  );
  const timestampTexts: string[] = [];
  const visitRenderedNode = (renderedNode: unknown): void => {
    if (Array.isArray(renderedNode)) {
      for (const child of renderedNode as readonly unknown[])
        visitRenderedNode(child);
    } else if (Vue.isVNode(renderedNode)) {
      if (renderedNode.props?.class === "lt") {
        assert.equal(typeof renderedNode.children, "string");
        timestampTexts.push(renderedNode.children as string);
      } else visitRenderedNode(renderedNode.children);
    }
  };
  visitRenderedNode(renderedTree);
  assert.equal(timestampTexts.length, logEntries.length);
  return timestampTexts;
}

test("compiled log timestamp text preserves the complete untrimmed 615e233 baseline", () => {
  const baselineSource = execFileSync(
    "git",
    ["show", "615e233:src/components/DockPanels.vue"],
    { encoding: "utf8", maxBuffer: 1_000_000 },
  );
  const currentSource = readFileSync(
    new URL("../src/components/DockPanels.vue", import.meta.url),
    "utf8",
  );
  const baselineTexts = renderLogTimestampTexts(baselineSource);
  assert.ok(baselineTexts.every((text) => text.startsWith("T+")));
  assert.deepEqual(renderLogTimestampTexts(currentSource), baselineTexts);
});
