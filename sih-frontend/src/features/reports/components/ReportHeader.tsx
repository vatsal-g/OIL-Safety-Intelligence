import { Badge } from "@/components/ui";
import { priorityTone, statusTone } from "@/lib/utils";
import type { Report } from "@/types/report";

export function ReportHeader({ report }: { report: Report }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 6,
      }}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 700 }} className="mono">
          {report.id}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
          {report.site} · {report.activity} · {report.timestamp}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Badge tone={priorityTone(report.priority)}>{report.priority} PRIORITY</Badge>
        <Badge tone={statusTone(report.status)}>{report.status}</Badge>
      </div>
    </div>
  );
}
