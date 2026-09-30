import type { Lifecycle } from "./types";

interface FocusTarget {
  element: HTMLElement | null;
  selector: string | null;
  owner: string | null;
  fallback: string;
}

export interface ModalFocusPresentation {
  entries: {
    dialog: string;
    opener: Omit<FocusTarget, "element"> | null;
  }[];
}

const presentations = new WeakMap<Lifecycle, () => ModalFocusPresentation>();

/** Capture stable identities only; the retiring lifecycle still owns all resources. */
export function captureModalFocus(
  lifecycle: Lifecycle,
): ModalFocusPresentation | undefined {
  return presentations.get(lifecycle)?.();
}

interface ModalEntry {
  dialog: HTMLElement;
  opener: FocusTarget | null;
}

/** One focus owner for Vue overlays, imperative/nested dialogs and body teleports. */
export function installModalFocus(
  lifecycle: Lifecycle,
  previous?: ModalFocusPresentation,
): void {
  const selector = '[role="dialog"][aria-modal],#endSkip';
  const focusable =
    'button,a[href],input,select,textarea,summary,[tabindex], [contenteditable="true"]';
  const inert = new Map<HTMLElement, boolean>();
  const modal = new Map<HTMLElement, string | null>();
  const temporaryTabindex = new Set<HTMLElement>();
  const dialogIdentity = (dialog: HTMLElement): string | null => {
    const host = dialog.closest<HTMLElement>("[id]");
    return host
      ? "#" +
          CSS.escape(host.id) +
          (host === dialog ? "" : ' [role="dialog"][aria-modal]')
      : null;
  };
  let stack: ModalEntry[] = (previous?.entries ?? []).flatMap((entry) => {
    const dialog = document.querySelector<HTMLElement>(entry.dialog);
    return dialog
      ? [
          {
            dialog,
            opener: entry.opener ? { ...entry.opener, element: null } : null,
          },
        ]
      : [];
  });
  const rememberFocus = (element: HTMLElement): FocusTarget => {
    // Keep direct-child keys distinct from nested clones in the same host.
    const key = ["data-id", "data-i", "data-tab", "data-k"].find((name) =>
      element.hasAttribute(name),
    );
    const host = element.parentElement?.closest<HTMLElement>("[id]");
    const selector = element.id
      ? "#" + CSS.escape(element.id)
      : key && host
        ? `#${CSS.escape(host.id)}${host === element.parentElement ? " > " : " "}[${key}="${CSS.escape(element.getAttribute(key)!)}"]`
        : null;
    const panel = element.closest("#sheet")
      ? document.querySelector('#tabs [data-tab="log"].on')
        ? "log"
        : "world"
      : element.closest("#treeModal")
        ? "tree"
        : null;
    const dialog = element.closest<HTMLElement>('[role="dialog"],#endSkip');
    return {
      element: element,
      selector,
      // Capture ownership while attached: Vue may detach the control before
      // the next observer delivery, leaving no DOM ancestry to inspect.
      owner: dialog ? dialogIdentity(dialog) : null,
      fallback: panel ? `#tabs [data-tab="${panel}"]` : "#btnMenu",
    };
  };
  let lastFocus =
    document.activeElement instanceof HTMLElement
      ? rememberFocus(document.activeElement)
      : null;
  let syncing = false;

  const visible = (element: HTMLElement): boolean => {
    if (!element.isConnected || element.closest("[hidden]")) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  };
  const roots = (entry: ModalEntry): HTMLElement[] => {
    if (entry.dialog.id === "endSkip")
      return [
        entry.dialog,
        ...document.querySelectorAll<HTMLElement>("#endFx,#endLog"),
      ];
    if (entry.dialog.id === "tcard")
      return [
        entry.dialog,
        ...document.querySelectorAll<HTMLElement>("#tscrim"),
      ];
    return [entry.dialog.closest<HTMLElement>(".overlay") || entry.dialog];
  };
  const usable = (element: HTMLElement): boolean =>
    visible(element) &&
    !element.closest('[inert],[aria-hidden="true"]') &&
    !element.matches(":disabled");
  const controls = (entry: ModalEntry): HTMLElement[] =>
    [
      entry.dialog,
      ...entry.dialog.querySelectorAll<HTMLElement>(focusable),
    ].filter(
      (element) =>
        element.matches(focusable) && element.tabIndex >= 0 && usable(element),
    );
  const focusEntry = (entry: ModalEntry): void => {
    const first = controls(entry)[0];
    if (first) first.focus({ preventScroll: true });
    else {
      // A dialog without actionable controls is still a focus destination.
      if (!entry.dialog.hasAttribute("tabindex")) {
        entry.dialog.tabIndex = -1;
        temporaryTabindex.add(entry.dialog);
      }
      entry.dialog.focus({ preventScroll: true });
    }
  };
  const isolate = (entry: ModalEntry | undefined): void => {
    const wanted = new Set<HTMLElement>();
    if (entry) {
      const allowed = roots(entry);
      const visit = (parent: HTMLElement): void => {
        for (const child of parent.children) {
          if (!(child instanceof HTMLElement)) continue;
          if (allowed.includes(child)) continue;
          if (allowed.some((root) => child.contains(root))) visit(child);
          else wanted.add(child);
        }
      };
      visit(document.body);
      // Within a nested dialog's ancestors, only its branch remains interactive.
      if (entry.dialog !== allowed[0]) {
        let branch = entry.dialog;
        while (branch !== allowed[0] && branch.parentElement) {
          for (const sibling of branch.parentElement.children)
            if (sibling !== branch && sibling instanceof HTMLElement)
              wanted.add(sibling);
          branch = branch.parentElement;
        }
      }
    }
    for (const [element, original] of inert) {
      if (!wanted.has(element)) {
        element.inert = original;
        inert.delete(element);
      }
    }
    for (const element of wanted) {
      if (!inert.has(element)) inert.set(element, element.inert);
      if (!element.inert) element.inert = true;
    }
    for (const item of stack) {
      if (item.dialog.id === "endSkip") continue;
      if (!modal.has(item.dialog))
        modal.set(item.dialog, item.dialog.getAttribute("aria-modal"));
      item.dialog.setAttribute("aria-modal", String(item === entry));
    }
  };
  const sync = (): void => {
    if (lifecycle.disposed || syncing) return;
    syncing = true;
    try {
      const oldTop = stack.at(-1);
      const shown = [
        ...document.querySelectorAll<HTMLElement>(selector),
      ].filter(visible);
      // A surviving dialog must inherit the dismissed owner's return destination.
      // Ownership survives detached controls and DOM-free replacement captures.
      for (const removed of stack.filter(
        (entry) => !shown.includes(entry.dialog),
      )) {
        const owner = dialogIdentity(removed.dialog);
        for (const entry of stack) {
          if (entry === removed) continue;
          if (owner && entry.opener?.owner === owner)
            entry.opener = removed.opener;
        }
      }
      stack = stack.filter((entry) => shown.includes(entry.dialog));
      for (const dialog of shown) {
        if (!stack.some((entry) => entry.dialog === dialog))
          stack.push({ dialog, opener: lastFocus });
      }
      stack.sort((a, b) => {
        const layers = (entry: ModalEntry): number[] => {
          const values: number[] = [];
          for (
            let element: HTMLElement | null = entry.dialog;
            element;
            element = element.parentElement
          ) {
            const value = Number.parseInt(getComputedStyle(element).zIndex);
            if (Number.isFinite(value)) values.unshift(value);
          }
          return values;
        };
        const left = layers(a),
          right = layers(b);
        for (let i = 0; i < Math.max(left.length, right.length); i++) {
          const difference = (left[i] || 0) - (right[i] || 0);
          if (difference) return difference;
        }
        // Equal layers paint in DOM order, not in opening chronology.
        const position = a.dialog.compareDocumentPosition(b.dialog);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
      const top = stack.at(-1);
      isolate(top);
      if (oldTop && oldTop !== top && !shown.includes(oldTop.dialog)) {
        const target = oldTop.opener;
        const opener = [
          target?.element,
          target?.selector
            ? document.querySelector<HTMLElement>(target.selector)
            : null,
          !top
            ? document.querySelector<HTMLElement>(
                target?.fallback ?? "#btnMenu",
              )
            : null,
        ].find(
          (element) =>
            element &&
            usable(element) &&
            (!top || top.dialog.contains(element)),
        );
        if (opener) opener.focus({ preventScroll: true });
        else if (top) focusEntry(top);
      }
      if (
        top &&
        (!top.dialog.contains(document.activeElement) ||
          !(document.activeElement instanceof HTMLElement) ||
          !usable(document.activeElement))
      )
        focusEntry(top);
    } finally {
      syncing = false;
    }
  };
  presentations.set(lifecycle, () => {
    sync();
    return {
      entries: stack.flatMap(({ dialog, opener }) => {
        const identity = dialogIdentity(dialog);
        if (!identity) return [];
        return [
          {
            dialog: identity,
            opener: opener
              ? {
                  selector: opener.selector,
                  owner: opener.owner,
                  fallback: opener.fallback,
                }
              : null,
          },
        ];
      }),
    };
  });
  lifecycle.listen(
    document,
    "focusin",
    (event) => {
      if (event.target instanceof HTMLElement)
        lastFocus = rememberFocus(event.target);
      if (!syncing) sync();
    },
    true,
  );
  lifecycle.listen(
    document,
    "keydown",
    (event) => {
      if (event.key !== "Tab") return;
      sync();
      const top = stack.at(-1);
      if (!top) return;
      const items = controls(top);
      const active = document.activeElement;
      const index = items.indexOf(active as HTMLElement);
      if (
        !items.length ||
        index < 0 ||
        (!event.shiftKey && index === items.length - 1) ||
        (event.shiftKey && index === 0)
      ) {
        event.preventDefault();
        if (items.length)
          items[event.shiftKey ? items.length - 1 : 0].focus({
            preventScroll: true,
          });
        else focusEntry(top);
      }
    },
    true,
  );
  const observer = new MutationObserver(sync);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden", "disabled"],
  });
  lifecycle.addCleanup(() => {
    presentations.delete(lifecycle);
    observer.disconnect();
    for (const [element, original] of inert) element.inert = original;
    for (const [element, original] of modal) {
      if (original === null) element.removeAttribute("aria-modal");
      else element.setAttribute("aria-modal", original);
    }
    for (const element of temporaryTabindex)
      element.removeAttribute("tabindex");
    stack = [];
    inert.clear();
    modal.clear();
  });
  sync();
}
