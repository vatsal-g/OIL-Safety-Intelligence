// sih-frontend/src/lib/api.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/** Helper to normalize and map report fields for frontend tables */
export function normalizeReport(report: any) {
  if (!report) return report;
  return {
    ...report,
    // Ensure fallback flat properties exist if frontend components look directly at them
    classification: report.finalResult?.classification || report.classification || "Non_SIF_Potential",
    iogpRule: report.finalResult?.iogpRule || report.iogpRule || "N/A",
    layerUsed: report.finalResult?.layerUsed || report.layerUsed || "layer1",
    reviewStatus: report.finalResult?.reviewStatus || report.reviewStatus || "pending",
  };
}

/** Fetch all reports with normalization */
export async function fetchReports(): Promise<any[]> {
  const reports = await fetchApi<any[]>("/reports");
  return Array.isArray(reports) ? reports.map(normalizeReport) : [];
}

/** Helper to update a report's review status in MongoDB */
export async function updateReportStatus(reportId: string, currentStatus: string): Promise<any> {
  const newStatus =
    currentStatus === "Needs Review" || currentStatus === "pending"
      ? "reviewed"
      : "pending";

  try {
    const updated = await fetchApi<any>(`/reports/${reportId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    return normalizeReport(updated);
  } catch (error: any) {
    console.error("Failed to update status:", error);
    alert("Could not update status: " + (error.message || "Unknown error"));
    throw error;
  }
}