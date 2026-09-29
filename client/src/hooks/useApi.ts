import { api } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

/** Minimal GET hook: { data, error, loading, refetch }. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    setLoading(true);
    api<T>(path)
      .then(d => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch(e => !cancelled && setError(e as Error))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path, nonce]);

  const refetch = useCallback(() => setNonce(n => n + 1), []);
  return { data, error, loading, refetch };
}
