import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { mapBackendReports } from "@/lib/adapters";
import type { Report } from "@/types/report";
import type { TriageFilters } from "@/types/common";

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      // GET http://localhost:5000/api/reports
      const data = await fetchApi<any[]>("/reports");
      setReports(mapBackendReports(data));
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch reports from backend:", err);
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return { reports, loading, error, refetch: loadReports };
}

export function useFilteredReports(filters: TriageFilters, reports: Report[] = []) {
  return useMemo(() => {
    return reports
      .filter((r) => {
        if (filters.priority !== "All" && r.priority !== filters.priority) return false;
        if (filters.site !== "All" && r.site !== filters.site) return false;
        if (filters.rule !== "All" && r.rule !== filters.rule) return false;
        if (filters.status !== "All" && r.status !== filters.status) return false;
        if (
          filters.q &&
          !(
            r.id.toLowerCase().includes(filters.q.toLowerCase()) ||
            r.text.toLowerCase().includes(filters.q.toLowerCase())
          )
        ) {
          return false;
        }
        return true;
      })
      // FIX: Sort by latest timestamp first instead of confidence score
      .sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
  }, [filters, reports]);
}