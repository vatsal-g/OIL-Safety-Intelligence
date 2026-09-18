import { useCallback, useEffect, useRef, useState } from "react";
import { getSystemStatus, type SystemStatusResponse } from "@/lib/api";

interface UseSystemStatusOptions {
  /** If true, re-checks every `intervalMs` on top of the initial check. Default false — manual only. */
  autoRefresh?: boolean;
  intervalMs?: number;
}

interface UseSystemStatusResult {
  data: SystemStatusResponse | null;
  error: Error | null;
  loading: boolean;
  /** True only while a check is actively in flight (initial or manual/auto refresh). */
  checking: boolean;
  /** Manually trigger a check right now. */
  refresh: () => void;
}

/**
 * Fetches GET /api/system/status once on mount. Auto re-checking on an
 * interval is opt-in via `autoRefresh` — by default this only checks
 * once, plus whenever `refresh()` is called (e.g. a "Check Now" button),
 * so nothing hammers the backend every 30s unless the user asks for it.
 */
export function useSystemStatus(options: UseSystemStatusOptions = {}): UseSystemStatusResult {
  const { autoRefresh = false, intervalMs = 30000 } = options;

  const [data, setData] = useState<SystemStatusResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [checking, setChecking] = useState(false);
  const cancelledRef = useRef(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const result = await getSystemStatus();
      if (!cancelledRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err : new Error("Failed to fetch system status"));
      }
    } finally {
      if (!cancelledRef.current) setChecking(false);
    }
  }, []);

  // Always check once on mount.
  useEffect(() => {
    cancelledRef.current = false;
    check();
    return () => {
      cancelledRef.current = true;
    };
  }, [check]);

  // Only loop on an interval when explicitly opted in.
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [autoRefresh, intervalMs, check]);

  return { data, error, loading: !data && !error, checking, refresh: check };
}

/** Overall state for a single glance (sidebar dot, header badge, etc). */
export function overallState(data: SystemStatusResponse | null): "up" | "degraded" | "down" | "unknown" {
  if (!data) return "unknown";
  const states = data.components
    .filter((c) => c.state !== "not_implemented")
    .map((c) => c.state);
  if (states.some((s) => s === "down")) return "down";
  if (states.some((s) => s === "degraded")) return "degraded";
  return "up";
}