import { useEffect, useRef, useState } from 'react';
import { USE_MOCK } from '../services/api.js';

function emptyFor(seed) {
  return Array.isArray(seed) ? [] : null;
}

/** Resolve service data without substituting sensor fixtures in live mode. */
export function useServiceData(fetcher, seed, deps = []) {
  const liveOnly = !USE_MOCK;
  const initial = liveOnly ? emptyFor(seed) : seed;
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const empty = emptyFor(seed);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setData(liveOnly ? empty : seed);
    Promise.resolve()
      .then(() => fetcherRef.current())
      .then((value) => {
        if (!alive) return;
        setData(value ?? empty);
        setStale(false);
      })
      .catch(() => {
        if (alive) {
          setData(empty);
          setStale(true);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, stale };
}
export default useServiceData;
