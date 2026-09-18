import { Card, SectionHead } from "@/components/ui";

interface OriginalReportProps {
  report?: any;
}

export function OriginalReport({ report }: OriginalReportProps) {
  return (
    <Card>
      <SectionHead eyebrow="Source Data" title="Original Safety Observation" />
      <div
        style={{
          marginTop: 12,
          padding: 14,
          background: "var(--bg-surface-elevated, #f9fafb)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          fontSize: 13.5,
          lineHeight: 1.6,
          color: "var(--ink)",
        }}
      >
        {report?.rawText || report?.text || "No observation description available."}
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 16,
          fontSize: 12,
          color: "var(--ink-soft)",
        }}
      >
        <div>
          <strong>Site Location:</strong> {report?.siteId || report?.site || "Digboi"}
        </div>
        <div>
          <strong>Report ID:</strong> <span className="mono">{report?.id || "N/A"}</span>
        </div>
      </div>
    </Card>
  );
}