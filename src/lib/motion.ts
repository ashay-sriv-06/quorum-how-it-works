import { useEffect, useRef, useState } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** false on the first paint, true afterwards: lets transitions run only on real changes. */
export function useAfterMount() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}

/** Remembers the previous value of something across renders. */
export function usePrevious<T>(value: T) {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

/** Ticks every second; returns ms remaining until `target` (never negative). */
export function useCountdown(target: string | null, stopped = false) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target || stopped) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target, stopped]);
  return target ? Math.max(0, Date.parse(target) - now) : 0;
}
