import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { mapBackendReport } from "@/lib/adapters";
import type { Report } from "@/types/report";

export function useReportDetail(id: string | undefined) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("No report ID provided");
      return;
    }

    async function loadDetail() {
      try {
        setLoading(true);
        const data = await fetchApi<any>(`/reports/${id}`);
        setReport(mapBackendReport(data));
        setError(null);
      } catch (err: any) {
        console.error("[useReportDetail] Failed to fetch report detail:", err);
        setError(err.message || "Failed to load report detail");
      } finally {
        setLoading(false);
      }
    }

    loadDetail();
  }, [id]);

  return { report, loading, error };
}