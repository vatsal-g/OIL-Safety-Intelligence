import { Card, SectionHead, Badge, Button } from "@/components/ui";
import { statusTone } from "@/lib/utils";
import type { Report } from "@/types/report";

export function HumanReview({ report }: { report: Report }) {
  return (
    <Card>
      <SectionHead eyebrow="Governance" title="Human Review" />
      {report.reviewer ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: "var(--ink-soft)" }}>Decision</span>
            <Badge tone={statusTone(report.status)}>{report.status}</Badge>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: "var(--ink-soft)" }}>Reviewer</span>
            <span style={{ fontWeight: 600 }}>{report.reviewer}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: "var(--ink-soft)" }}>Timestamp</span>
            <span>{report.timestamp}</span>
          </div>
          {report.reviewNote && (
            <div
              style={{
                fontSize: 12.5,
                color: "var(--ink)",
                background: "var(--paper)",
                border: "1px solid var(--line-soft)",
                borderRadius: 6,
                padding: 10,
                lineHeight: 1.5,
              }}
            >
              {report.reviewNote}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
            This report has not yet been reviewed by a human.
          </div>
          <Button variant="outline">Begin Review</Button>
        </div>
      )}
    </Card>
  );
}
