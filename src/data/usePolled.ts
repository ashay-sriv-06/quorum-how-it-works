import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, DATA_CHANGED } from "./adapter";

/**
 * Fetch, then re-fetch every `interval` ms while the tab is visible.
 * Poll results replace data only when they differ, so views re-render (and
 * animate) only on real state transitions.
 */
export function usePolled<T>(key: string, fetcher: () => Promise<T>, interval = 2000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const lastJson = useRef<string>("");

  const apply = useCallback((next: T) => {
    const json = JSON.stringify(next);
    if (json !== lastJson.current) {
      lastJson.current = json;
      setData(next);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await fetcherRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e : new ApiRequestError(0, "server", "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    // keep showing the previous result while a new key loads (no skeleton flash)
    lastJson.current = "";
    setError(null);
    refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, interval);
    const onChange = () => refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    window.addEventListener(DATA_CHANGED, onChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(DATA_CHANGED, onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [key, interval, refresh]);

  return { data, error, loading, refresh, apply };
}
