/** Tracks every browser resource created by the retained controllers. */
import type { Lifecycle } from "./types";
export function createLifecycle(): Lifecycle {
  let disposed = false;
  const timers = new Set<number>(),
    frames = new Set<number>(),
    intervals = new Set<number>(),
    cleanup: (() => void)[] = [];
  const life: Lifecycle = {
    get disposed() {
      return disposed;
    },
    later(fn, ms) {
      if (disposed) return 0;
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!disposed) fn();
      }, ms);
      timers.add(id);
      return id;
    },
    cancelLater(id) {
      window.clearTimeout(id);
      if (id !== undefined) timers.delete(id);
    },
    raf(fn) {
      if (disposed) return 0;
      const id = requestAnimationFrame((t) => {
        frames.delete(id);
        if (!disposed) fn(t);
      });
      frames.add(id);
      return id;
    },
    cancelRaf(id) {
      cancelAnimationFrame(id);
      frames.delete(id);
    },
    every(fn, ms) {
      const id = window.setInterval(() => {
        if (!disposed) fn();
      }, ms);
      intervals.add(id);
      return id;
    },
    on(target, event, fn, options) {
      // Event name and callback are correlated by Lifecycle.on; EventTarget loses that relationship.
      target.addEventListener(event, fn as EventListener, options);
      cleanup.push(() =>
        target.removeEventListener(event, fn as EventListener, options),
      );
    },
    observe(target, fn) {
      const observer = new ResizeObserver(() => {
        if (!disposed) fn();
      });
      observer.observe(target);
      cleanup.push(() => observer.disconnect());
      return observer;
    },
    add(fn) {
      cleanup.push(fn);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      timers.forEach(window.clearTimeout);
      frames.forEach(cancelAnimationFrame);
      intervals.forEach(window.clearInterval);
      cleanup.reverse().forEach((fn) => fn());
      timers.clear();
      frames.clear();
      intervals.clear();
      cleanup.length = 0;
    },
    counts() {
      return {
        timers: timers.size,
        frames: frames.size,
        intervals: intervals.size,
        disposers: cleanup.length,
      };
    },
  };
  return life;
}
