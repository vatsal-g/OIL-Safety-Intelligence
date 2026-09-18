import { Card } from "@/components/ui";
import { TriageFilterBar } from "./TriageFilterBar";
import { TriageTable } from "./TriageTable";
import { useTriageFilters } from "../hooks/useTriageFilters";
import { useReports, useFilteredReports } from "../hooks/useReports";

/** The filter bar + report table shared by the Triage queue and the Reports list. */
export function TriageBoard() {
  const { reports, loading, error, refetch } = useReports();
  const { filters, setFilters } = useTriageFilters();
  const filteredReports = useFilteredReports(filters, reports);

  if (loading) {
    return (
      <Card>
        <div style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
          Loading reports from backend server...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div style={{ padding: "24px", textAlign: "center", color: "#ef4444" }}>
          Failed to load reports: {error}
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <TriageFilterBar filters={filters} setFilters={setFilters} resultCount={filteredReports.length} />
      <Card padded={false}>
        <TriageTable reports={filteredReports} onReportUpdate={refetch} />
      </Card>
    </div>
  );
}