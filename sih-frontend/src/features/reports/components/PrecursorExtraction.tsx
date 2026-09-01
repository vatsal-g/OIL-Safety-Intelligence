import { Card, SectionHead, Badge } from "@/components/ui";
import type { Report } from "@/types/report";

export function PrecursorExtraction({ report }: { report: Report }) {
  return (
    <Card>
      <SectionHead eyebrow="Extraction" title="Precursor Extraction" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--ink-soft)" }}>Activity</span>
          <Badge>{report.activity}</Badge>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--ink-soft)" }}>Primary rule</span>
          <Badge tone="blue">{report.rule}</Badge>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--ink-soft)" }}>Site</span>
          <Badge>{report.site}</Badge>
        </div>
      </div>
    </Card>
  );
}
