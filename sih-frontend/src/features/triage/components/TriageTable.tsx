import { useState } from "react";
import { Badge } from "@/components/ui";
import { DataTable, type DataTableColumn } from "@/components/data-display";
import { priorityTone, statusTone } from "@/lib/utils";
import { useNavigation } from "@/hooks/useNavigation";
import { updateReportStatus } from "@/lib/api";
import type { Report } from "@/types/report";

export interface TriageTableProps {
  reports: Report[];
  onReportUpdate?: () => void;
}

export function TriageTable({ reports, onReportUpdate }: TriageTableProps) {
  const { openReport } = useNavigation();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusToggle = async (
    e: React.MouseEvent,
    reportId: string,
    currentStatus: string
  ) => {
    e.stopPropagation();

    setUpdatingId(reportId);
    try {
      await updateReportStatus(reportId, currentStatus);
      if (onReportUpdate) {
        onReportUpdate();
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const columns: DataTableColumn<Report>[] = [
    { header: "Report", render: (r) => <span className="mono">{r.id}</span> },
    { header: "Location", render: (r) => r.site || "N/A" },
    { header: "Rule", render: (r) => r.rule || "General Safety" },
    {
      header: "Priority",
      render: (r) => <Badge tone={priorityTone(r.priority)}>{r.priority || "MEDIUM"}</Badge>,
    },
    {
      header: "SIF",
      render: (r) => (typeof r.sif === "boolean" ? (r.sif ? "High" : "Low") : r.sif || "Low"),
    },
    {
      header: "Confidence",
      render: (r) => `${r.confidence ?? 0}%`,
    },
    {
      header: "Status",
      render: (r) => {
        const isUpdating = updatingId === r.id;
        return (
          <button
            onClick={(e) => handleStatusToggle(e, r.id, r.status)}
            disabled={isUpdating}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: isUpdating ? "not-allowed" : "pointer",
              opacity: isUpdating ? 0.6 : 1,
            }}
            title="Click to toggle status"
          >
            <Badge tone={statusTone(r.status)}>
              {isUpdating ? "Updating..." : r.status || "New"}
            </Badge>
          </button>
        );
      },
    },
    {
      header: "Timestamp",
      render: (r) => <span style={{ color: "var(--ink-soft)" }}>{r.timestamp}</span>,
    },
  ];

  if (reports.length === 0) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-soft)", fontSize: 13 }}>
        No reports match the current filters.
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      rows={reports}
      rowKey={(r) => r.id}
      onRowClick={(r) => openReport(r.id)}
    />
  );
}