import type {
  RuntimeContext,
  EventChoice,
  NewsEntry,
  GameState,
  GameUI,
  EventPresentation,
} from "./types";
import { toRaw } from "vue";
// Extracted original rules/controller; all cross-domain access is explicit.
export function installEventController(context: RuntimeContext) {
  let restoring: EventPresentation | null = null;
  context.restoreEventPresentation = () => {
    const presentation = context.eventPresentation;
    if (!presentation) return;
    restoring = presentation;
    try {
      if (presentation.type === "news")
        context.showNews(
          presentation.news,
          presentation.decisionCount,
          presentation.urgent,
        );
      else
        context.showEvent(presentation.event, {
          ...presentation.options,
          suppressAlert: true,
        });
    } finally {
      restoring = null;
    }
  };
  context.DICE_ICON_SVG =
    '<svg class="dz" viewBox="0 0 40 30" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="1.5" y="6.5" width="17" height="17" rx="3.5" transform="rotate(-12 10 15)"/><rect x="21.5" y="4.5" width="17" height="17" rx="3.5" transform="rotate(10 30 13)"/><g fill="currentColor" stroke="none"><circle cx="6.6" cy="11.4" r="1.5"/><circle cx="10" cy="15" r="1.5"/><circle cx="13.4" cy="18.6" r="1.5"/><circle cx="25.8" cy="8.6" r="1.5"/><circle cx="34.2" cy="8.6" r="1.5"/><circle cx="25.8" cy="17.4" r="1.5"/><circle cx="34.2" cy="17.4" r="1.5"/></g></svg>';
  context.renderEventOutcome = function renderEventOutcome(text, dice, roll) {
    const outcomeElement = context.requireElement("#evOutcome");
    outcomeElement.classList.toggle("dice", !!dice);
    outcomeElement.innerHTML = dice
      ? context.DICE_ICON_SVG.replace(
          'class="dz"',
          'class="dz' + (roll ? " roll" : "") + '"',
        ) +
        "<span>" +
        context.escapeHtml(text) +
        "</span>"
      : context.escapeHtml(text);
  };
  context.previewEventChoice = function previewEventChoice(choice) {
    // Read Vue's raw state once. History text is not serialized 200 times.
    const snapshot = JSON.parse(
      JSON.stringify({
        state: toRaw(context.state),
        ui: toRaw(context.ui),
      }),
    ) as { state: GameState; ui: GameUI };
    const { log, ...rulesState } = snapshot.state;
    const originalPorts = {
        showToast: context.showToast,
        publishBulletin: context.publishBulletin,
        appendRunLog: context.appendRunLog,
        enqueueTickerHeadline: context.enqueueTickerHeadline,
        pulseRegion: context.pulseRegion,
        saveRun: context.saveRun,
        pickRandomRegionIds: context.pickRandomRegionIds,
        playSoundCue: context.soundController.playCue,
        random: Math.random,
      },
      outcomes: string[] = [];
    let usesRandomness = false;
    context.showToast =
      context.publishBulletin =
      context.appendRunLog =
      context.enqueueTickerHeadline =
      context.pulseRegion =
      context.saveRun =
        () => {};
    context.soundController.playCue = () => {};
    context.pickRandomRegionIds = (regionCount) =>
      Object.assign(
        context.REGION_DEFINITIONS.filter(
          (region, regionIndex) => context.state.regions[regionIndex].a > 0.005,
        )
          .concat(context.REGION_DEFINITIONS)
          .slice(0, regionCount)
          .map((region) => region.id),
        { label: regionCount + " random regions where you are present" },
      );
    try {
      for (
        let sampleIndex = 0;
        sampleIndex < (usesRandomness ? 200 : 1);
        sampleIndex++
      ) {
        let randomState = (sampleIndex * 2654435761 + 1) >>> 0;
        Math.random = () => {
          usesRandomness = true;
          randomState = (randomState + 0x6d2b79f5) >>> 0;
          let mixedRandomState = randomState;
          mixedRandomState = Math.imul(
            mixedRandomState ^ (mixedRandomState >>> 15),
            mixedRandomState | 1,
          );
          mixedRandomState ^=
            mixedRandomState +
            Math.imul(
              mixedRandomState ^ (mixedRandomState >>> 7),
              mixedRandomState | 61,
            );
          return (
            ((mixedRandomState ^ (mixedRandomState >>> 14)) >>> 0) / 4294967296
          );
        };
        try {
          const sample = {
            ...structuredClone(rulesState),
            log: log.map((entry) => ({ ...entry })),
          };
          const outcome = context.withIsolatedState(
            sample,
            structuredClone(snapshot.ui),
            () => choice.applyEffects() || "Nothing changes.",
          );
          if (!outcomes.includes(outcome)) outcomes.push(outcome);
        } catch (err) {}
      }
    } finally {
      context.showToast = originalPorts.showToast;
      context.publishBulletin = originalPorts.publishBulletin;
      context.appendRunLog = originalPorts.appendRunLog;
      context.enqueueTickerHeadline = originalPorts.enqueueTickerHeadline;
      context.pulseRegion = originalPorts.pulseRegion;
      context.saveRun = originalPorts.saveRun;
      context.pickRandomRegionIds = originalPorts.pickRandomRegionIds;
      context.soundController.playCue = originalPorts.playSoundCue;
      Math.random = originalPorts.random;
    }
    return { outcomes: outcomes, usesRandomness: usesRandomness };
  };
  context.showEvent = function showEvent(event, options) {
    options = options || {};
    const presentation: Extract<EventPresentation, { type: "decision" }> =
      restoring?.type === "decision"
        ? restoring
        : {
            type: "decision",
            event: event,
            options: options,
            selectedChoice: null,
            choicePreview: null,
            choiceApplied: false,
            outcomeText: null,
          };
    context.eventPresentation = presentation;
    const onComplete = options.onComplete || context.closeEvent;
    context.ui.modal = "event";
    context.requireElement("#evNews").hidden = true;
    context
      .requireElement("#eventModal .modal")
      .classList.toggle(
        "emerg",
        event.kind === "INCIDENT" || event.kind === "COUNTERMOVE",
      );
    context.requireElement("#evKind").className = "kind " + event.kind;
    context.requireElement("#evKind").textContent =
      context.getBulletinKindLabel(event.kind).toLowerCase() +
      (options.stepLabel ? " · " + options.stepLabel : "");
    context.requireElement("#evTime").textContent =
      "T+" + context.formatElapsedTime(context.state.t);
    context.requireElement("#evTitle").textContent = event.title;
    context.requireElement("#evBody").textContent = event.body;
    const historicalContextElement = context.requireElement("#evReal");
    if (event.historicalContext) {
      context.requireElement("#evRealTx").textContent = event.historicalContext;
      historicalContextElement.hidden = false;
    } else historicalContextElement.hidden = true;
    const choicesElement = context.requireElement("#evChoices");
    choicesElement.innerHTML = "";
    choicesElement.hidden = false;
    context.requireElement("#evOutcome").hidden = true;
    context.requireElement("#evContinue").hidden = true;
    let resolved = presentation.choiceApplied;
    // A choice that spends compute you do not have is locked, unless every choice is, so no event can trap you.
    const getChoiceComputeCost = (choice: EventChoice) => {
      const costMatch = String(choice.applyEffects).match(
        /effects\.adjustCompute\(-(\d+)\)/,
      );
      return costMatch ? +costMatch[1] : 0;
    };
    const isChoiceUnaffordable = (choice: EventChoice) =>
      getChoiceComputeCost(choice) > context.state.pts;
    const allChoicesUnavailable = event.choices.every(
      (choice) =>
        (choice.isAvailable && !choice.isAvailable(context.state)) ||
        isChoiceUnaffordable(choice),
    );
    event.choices.forEach((choice) => {
      if (
        !allChoicesUnavailable &&
        isChoiceUnaffordable(choice) &&
        (!choice.isAvailable || choice.isAvailable(context.state))
      ) {
        const choiceButton = document.createElement("button");
        choiceButton.className = "choice locked";
        choiceButton.disabled = true;
        choiceButton.setAttribute("aria-disabled", "true");
        choiceButton.innerHTML =
          "<b>" +
          context.escapeHtml(choice.label) +
          "</b><span>Needs " +
          getChoiceComputeCost(choice) +
          " compute</span>";
        choicesElement.appendChild(choiceButton);
        return;
      }
      const open = !choice.isAvailable || choice.isAvailable(context.state);
      // A choice that belongs to a path you did not take stays hidden: it is not a teaser, it is a closed door.
      if (
        !open &&
        choice.requirementText &&
        context.UPGRADE_DEFINITIONS.some(
          (upgrade) =>
            upgrade.name === choice.requirementText &&
            context.isUpgradeForkClosed(upgrade),
        )
      )
        return;
      const choiceButton = document.createElement("button");
      const special = !!(
        choice.sourceUpgradeName ||
        (choice.isAvailable && choice.requirementText && open)
      );
      choiceButton.className =
        "choice" + (open ? "" : " locked") + (special ? " special" : "");
      choiceButton.innerHTML =
        (special
          ? '<em class="src">' +
            context.escapeHtml(
              choice.sourceUpgradeName || choice.requirementText,
            ) +
            "</em>"
          : "") +
        "<b>" +
        context.escapeHtml(choice.label) +
        "</b><span>" +
        context.escapeHtml(
          open
            ? choice.hint
            : "Requires " +
                (choice.requirementText || "an upgrade you do not have"),
        ) +
        "</span>";
      if (!open) {
        choiceButton.disabled = true;
        choiceButton.setAttribute("aria-disabled", "true");
        choicesElement.appendChild(choiceButton);
        return;
      }
      // Tapping a choice shows what it will do on a second screen. Nothing is applied until Continue,
      // so Back simply returns to the choices. Gambles show both possible results and roll on Continue.
      choiceButton.onclick = () => {
        if (resolved) return;
        selectedChoice = choice;
        const { outcomes: outcomes, usesRandomness: usesRandomness } =
          context.previewEventChoice(choice);
        selectedChoiceUsesRandomness = usesRandomness;
        presentation.selectedChoice = choice;
        presentation.choicePreview = {
          outcomes: outcomes,
          usesRandomness: usesRandomness,
        };
        choicesElement.hidden = true;
        context.requireElement("#evOutcome").hidden = false;
        context.renderEventOutcome(
          choice.label +
            " — " +
            (!usesRandomness
              ? outcomes[0]
              : outcomes.length === 2
                ? "Chance decides. Either: " +
                  outcomes[0] +
                  "  —or—  " +
                  outcomes[1]
                : "Chance decides. The result is rolled when you continue."),
          usesRandomness,
          false,
        );
        context.requireElement("#evContinue").hidden = false;
        context.requireElement("#evBack").hidden = false;
        context.soundController.playCue("tap");
      };
      choicesElement.appendChild(choiceButton);
    });
    let selectedChoice: EventChoice | null = presentation.selectedChoice;
    let selectedChoiceUsesRandomness =
      presentation.choicePreview?.usesRandomness ?? false;
    context.requireElement("#evOutcome").hidden = true;
    context.requireElement("#evContinue").hidden = true;
    context.requireElement("#evContinue").textContent = "Continue";
    context.requireElement("#evBack").hidden = true;
    context.requireElement("#evBack").onclick = () => {
      if (resolved) return;
      selectedChoice = null;
      selectedChoiceUsesRandomness = false;
      presentation.selectedChoice = null;
      presentation.choicePreview = null;
      choicesElement.hidden = false;
      context.requireElement("#evOutcome").hidden = true;
      context.requireElement("#evContinue").hidden = true;
      context.requireElement("#evBack").hidden = true;
      context.soundController.playCue("tap");
    };
    context.requireElement("#evContinue").onclick = () => {
      if (context.state.ended) {
        context.closeBriefing();
        return;
      }
      if (resolved || !selectedChoice) {
        onComplete();
        return;
      }
      resolved = true;
      presentation.choiceApplied = true;
      const choice = selectedChoice,
        gamble = selectedChoiceUsesRandomness;
      context.requireElement("#evBack").hidden = true;
      const outcomeText = choice.applyEffects() || "Done.";
      presentation.outcomeText = outcomeText;
      if (context.ui.activeBriefing)
        context.ui.activeBriefing.completedDecisionCount =
          context.ui.activeBriefing.nextDecisionIndex;
      context.appendRunLog(
        event.kind,
        event.title,
        event.body + " You chose: " + choice.label + ".",
        outcomeText,
        event.historicalContext,
      );
      context.enqueueTickerHeadline(event.title);
      context.soundController.playCue("buy");
      context.ui.dirty = true;
      if (context.resolveTerminalOutcome()) {
        context.closeBriefing();
        return;
      }
      context.saveRun();
      // A gamble's result is news, so show it before closing; a certain choice already showed its result.
      if (gamble) {
        context.renderEventOutcome(
          choice.label + " — " + outcomeText,
          true,
          true,
        );
        context.requireElement("#evContinue").textContent =
          options.continueLabel || "Close";
      } else onComplete();
    };
    if (selectedChoice && presentation.choicePreview) {
      const { outcomes: outcomes, usesRandomness: usesRandomness } =
        presentation.choicePreview;
      choicesElement.hidden = true;
      context.requireElement("#evOutcome").hidden = false;
      context.requireElement("#evContinue").hidden = false;
      context.requireElement("#evBack").hidden = resolved;
      if (resolved) {
        context.renderEventOutcome(
          selectedChoice.label + " — " + presentation.outcomeText,
          usesRandomness,
          false,
        );
        context.requireElement("#evContinue").textContent =
          options.continueLabel || "Close";
      } else {
        context.renderEventOutcome(
          selectedChoice.label +
            " — " +
            (!usesRandomness
              ? outcomes[0]
              : outcomes.length === 2
                ? "Chance decides. Either: " +
                  outcomes[0] +
                  "  —or—  " +
                  outcomes[1]
                : "Chance decides. The result is rolled when you continue."),
          usesRandomness,
          false,
        );
      }
    }
    context.requireElement("#eventModal").hidden = false;
    if (!options.suppressAlert) {
      context.soundController.playCue("alert");
      if (navigator.vibrate)
        try {
          navigator.vibrate(30);
        } catch (error) {}
    }
  };
  context.closeEvent = function closeEvent() {
    context.eventPresentation = null;
    context.requireElement("#eventModal").hidden = true;
    context.ui.modal = null;
  };
  context.BRIEFING_INTERVAL_SECONDS = 30;
  context.URGENT_BRIEFING_GAP_SECONDS =
    context.SIMULATION_TUNING.minimumUrgentBriefingIntervalSeconds;
  context.isBriefingDue = function isBriefingDue() {
    const briefingQueue = context.state.brief;
    return (
      (briefingQueue.news.length > 0 || briefingQueue.dec.length > 0) &&
      ((briefingQueue.urgent &&
        context.ui.briefingElapsedSeconds >=
          context.URGENT_BRIEFING_GAP_SECONDS) ||
        context.ui.briefingElapsedSeconds >= context.BRIEFING_INTERVAL_SECONDS)
    );
  };
  context.openBriefing = function openBriefing() {
    const briefingQueue = context.state.brief,
      urgent = briefingQueue.urgent;
    context.ui.briefingElapsedSeconds = 0;
    briefingQueue.urgent = false;
    const news = briefingQueue.news.splice(0),
      decisions = briefingQueue.dec.splice(0);
    context.ui.activeBriefing = {
      decisions: decisions,
      nextDecisionIndex: 0,
      completedDecisionCount: 0,
    };
    if (news.length) context.showNews(news, decisions.length, urgent);
    else context.nextDecision(true);
  };
  context.showNews = function showNews(news, decisionCount, urgent) {
    context.eventPresentation = {
      type: "news",
      news,
      decisionCount: decisionCount,
      urgent,
    };
    context.ui.modal = "event";
    context
      .requireElement("#eventModal .modal")
      .classList.toggle("emerg", !!urgent);
    context.requireElement("#evKind").className =
      "kind " + (urgent ? "COUNTERMOVE" : "HEADLINE");
    context.requireElement("#evKind").textContent = urgent
      ? "emergency briefing"
      : "briefing";
    context.requireElement("#evTime").textContent =
      "T+" + context.formatElapsedTime(context.state.t);
    context.requireElement("#evTitle").textContent = urgent
      ? "Something just happened"
      : "While you were busy";
    context.requireElement("#evBody").textContent = decisionCount
      ? "Then " +
        (decisionCount > 1
          ? decisionCount + " decisions need"
          : "a decision needs") +
        " you."
      : "";
    // The same headline more than once collapses into one line with a count. Emergencies first.
    const groups: (NewsEntry & { occurrenceCount: number })[] = [];
    for (const newsEntry of news) {
      const group = groups.find((group) => group.title === newsEntry.title);
      if (group) {
        group.occurrenceCount++;
        group.u = group.u || newsEntry.u;
        group.out = newsEntry.out || group.out;
      } else groups.push(Object.assign({}, newsEntry, { occurrenceCount: 1 }));
    }
    groups.sort((a, b) => Number(b.u) - Number(a.u));
    context.requireElement("#evNews").innerHTML = groups
      .map(
        (group) =>
          '<li class="' +
          (group.u
            ? "urgent"
            : group.kind === "OPPORTUNITY" || group.kind === "MILESTONE"
              ? "good"
              : "") +
          '"><b>' +
          context.escapeHtml(group.title) +
          (group.occurrenceCount > 1 ? " ×" + group.occurrenceCount : "") +
          "</b>" +
          (group.out
            ? "<span>" + context.escapeHtml(group.out) + "</span>"
            : "") +
          "</li>",
      )
      .join("");
    context.requireElement("#evNews").hidden = false;
    context.requireElement("#evReal").hidden = true;
    context.requireElement("#evChoices").hidden = true;
    context.requireElement("#evOutcome").hidden = true;
    context.requireElement("#evBack").hidden = true;
    const continueButton = context.requireElement("#evContinue");
    continueButton.hidden = false;
    continueButton.textContent = decisionCount
      ? "Next: " +
        (decisionCount > 1 ? decisionCount + " decisions" : "decision")
      : "Close";
    continueButton.onclick = () => {
      if (decisionCount) context.nextDecision(false);
      else context.closeBriefing();
    };
    context.requireElement("#eventModal").hidden = false;
    context.soundController.playCue(urgent ? "alert" : "event");
    if (urgent && navigator.vibrate)
      try {
        navigator.vibrate(30);
      } catch (error) {}
  };
  context.nextDecision = function nextDecision(loud) {
    if (context.state.ended) {
      context.closeBriefing();
      return;
    }
    const briefing = context.ui.activeBriefing;
    while (briefing && briefing.nextDecisionIndex < briefing.decisions.length) {
      const decision = briefing.decisions[briefing.nextDecisionIndex++];
      const event =
        decision.t === "eval"
          ? context.state.phase < 2 && context.state.flags.launched
            ? context.createCapabilityAudit()
            : null
          : context.EVENT_DEFINITIONS.find((event) => event.id === decision.id);
      if (!event || !event.choices) continue;
      const remainingDecisionCount =
        briefing.decisions.length - briefing.nextDecisionIndex;
      context.showEvent(event, {
        stepLabel:
          briefing.decisions.length > 1
            ? "decision " +
              briefing.nextDecisionIndex +
              " of " +
              briefing.decisions.length
            : "",
        onComplete: remainingDecisionCount
          ? () => context.nextDecision(false)
          : context.closeBriefing,
        continueLabel: remainingDecisionCount ? "Next" : "Close",
        suppressAlert: !loud,
      });
      return;
    }
    context.closeBriefing();
  };
  context.closeBriefing = function closeBriefing() {
    context.ui.activeBriefing = null;
    context.closeEvent();
  };
}
