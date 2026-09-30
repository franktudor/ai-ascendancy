import type { Lifecycle } from "./types";

interface FocusTarget {
  element: HTMLElement;
  selector: string | null;
  fallback: string;
}

interface ModalEntry {
  dialog: HTMLElement;
  opener: FocusTarget | null;
}

/** One focus owner for Vue overlays, imperative/nested dialogs and body teleports. */
export function installModalFocus(life: Lifecycle): void {
  const selector = '[role="dialog"][aria-modal],#endSkip';
  const focusable =
    'button,a[href],input,select,textarea,summary,[tabindex], [contenteditable="true"]';
  const inert = new Map<HTMLElement, boolean>();
  const modal = new Map<HTMLElement, string | null>();
  const temporaryTabindex = new Set<HTMLElement>();
  let stack: ModalEntry[] = [];
  const rememberFocus = (el: HTMLElement): FocusTarget => {
    // Qualify repeatable keys by their host: list and graph share data-id values.
    const key = ["data-id", "data-i", "data-tab", "data-k"].find((name) =>
      el.hasAttribute(name),
    );
    const host = el.parentElement?.closest<HTMLElement>("[id]");
    const selector = el.id
      ? "#" + CSS.escape(el.id)
      : key && host
        ? `#${CSS.escape(host.id)} [${key}="${CSS.escape(el.getAttribute(key)!)}"]`
        : null;
    const panel = el.closest("#sheet")
      ? document.querySelector('#tabs [data-tab="log"].on')
        ? "log"
        : "world"
      : el.closest("#treeModal")
        ? "tree"
        : null;
    return {
      element: el,
      selector,
      fallback: panel ? `#tabs [data-tab="${panel}"]` : "#btnMenu",
    };
  };
  let lastFocus =
    document.activeElement instanceof HTMLElement
      ? rememberFocus(document.activeElement)
      : null;
  let syncing = false;

  const visible = (el: HTMLElement): boolean => {
    if (!el.isConnected || el.closest("[hidden]")) return false;
    const style = getComputedStyle(el);
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
  const usable = (el: HTMLElement): boolean =>
    visible(el) &&
    !el.closest('[inert],[aria-hidden="true"]') &&
    !el.matches(":disabled");
  const controls = (entry: ModalEntry): HTMLElement[] =>
    [
      entry.dialog,
      ...entry.dialog.querySelectorAll<HTMLElement>(focusable),
    ].filter((el) => el.matches(focusable) && el.tabIndex >= 0 && usable(el));
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
    for (const [el, original] of inert) {
      if (!wanted.has(el)) {
        el.inert = original;
        inert.delete(el);
      }
    }
    for (const el of wanted) {
      if (!inert.has(el)) inert.set(el, el.inert);
      if (!el.inert) el.inert = true;
    }
    for (const item of stack) {
      if (item.dialog.id === "endSkip") continue;
      if (!modal.has(item.dialog))
        modal.set(item.dialog, item.dialog.getAttribute("aria-modal"));
      item.dialog.setAttribute("aria-modal", String(item === entry));
    }
  };
  const sync = (): void => {
    if (life.disposed || syncing) return;
    syncing = true;
    try {
      const oldTop = stack.at(-1);
      const shown = [
        ...document.querySelectorAll<HTMLElement>(selector),
      ].filter(visible);
      stack = stack.filter((entry) => shown.includes(entry.dialog));
      for (const dialog of shown) {
        if (!stack.some((entry) => entry.dialog === dialog))
          stack.push({ dialog, opener: lastFocus });
      }
      stack.sort((a, b) => {
        const layers = (entry: ModalEntry): number[] => {
          const values: number[] = [];
          for (
            let el: HTMLElement | null = entry.dialog;
            el;
            el = el.parentElement
          ) {
            const value = Number.parseInt(getComputedStyle(el).zIndex);
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
        ].find((el) => el && usable(el) && (!top || top.dialog.contains(el)));
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
  life.on(
    document,
    "focusin",
    (event) => {
      if (event.target instanceof HTMLElement)
        lastFocus = rememberFocus(event.target);
      if (!syncing) sync();
    },
    true,
  );
  life.on(
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
  life.add(() => {
    observer.disconnect();
    for (const [el, original] of inert) el.inert = original;
    for (const [el, original] of modal) {
      if (original === null) el.removeAttribute("aria-modal");
      else el.setAttribute("aria-modal", original);
    }
    for (const el of temporaryTabindex) el.removeAttribute("tabindex");
    stack = [];
    inert.clear();
    modal.clear();
  });
  sync();
}
