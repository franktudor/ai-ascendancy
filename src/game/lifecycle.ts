/** Tracks every browser resource created by the retained controllers. */
import type { Lifecycle } from "./types";
export function createLifecycle(): Lifecycle {
  let disposed = false;
  const timeoutIds = new Set<number>(),
    animationFrameIds = new Set<number>(),
    intervals = new Set<number>(),
    cleanup: (() => void)[] = [];
  const lifecycle: Lifecycle = {
    get disposed() {
      return disposed;
    },
    setTimeout(callback, delayMs) {
      if (disposed) return 0;
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        if (!disposed) callback();
      }, delayMs);
      timeoutIds.add(timeoutId);
      return timeoutId;
    },
    clearTimeout(timeoutId) {
      window.clearTimeout(timeoutId);
      if (timeoutId !== undefined) timeoutIds.delete(timeoutId);
    },
    requestAnimationFrame(callback) {
      if (disposed) return 0;
      const animationFrameId = requestAnimationFrame((timestampMs) => {
        animationFrameIds.delete(animationFrameId);
        if (!disposed) callback(timestampMs);
      });
      animationFrameIds.add(animationFrameId);
      return animationFrameId;
    },
    cancelAnimationFrame(animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameIds.delete(animationFrameId);
    },
    setInterval(callback, intervalMs) {
      const intervalId = window.setInterval(() => {
        if (!disposed) callback();
      }, intervalMs);
      intervals.add(intervalId);
      return intervalId;
    },
    listen(target, event, handler, options) {
      // Event name and callback are correlated by Lifecycle.on; EventTarget loses that relationship.
      target.addEventListener(event, handler as EventListener, options);
      cleanup.push(() =>
        target.removeEventListener(event, handler as EventListener, options),
      );
    },
    observeResize(target, callback) {
      const observer = new ResizeObserver(() => {
        if (!disposed) callback();
      });
      observer.observe(target);
      cleanup.push(() => observer.disconnect());
      return observer;
    },
    addCleanup(callback) {
      cleanup.push(callback);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      timeoutIds.forEach(window.clearTimeout);
      animationFrameIds.forEach(cancelAnimationFrame);
      intervals.forEach(window.clearInterval);
      cleanup.reverse().forEach((callback) => callback());
      timeoutIds.clear();
      animationFrameIds.clear();
      intervals.clear();
      cleanup.length = 0;
    },
    resourceCounts() {
      return {
        timeouts: timeoutIds.size,
        animationFrames: animationFrameIds.size,
        intervals: intervals.size,
        disposers: cleanup.length,
      };
    },
  };
  return lifecycle;
}
