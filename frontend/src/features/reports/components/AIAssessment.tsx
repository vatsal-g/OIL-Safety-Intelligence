import { Card, SectionHead, Badge } from "@/components/ui";
import { ProgressBar } from "@/components/data-display";
import { sifColor } from "@/lib/utils";
import type { Report } from "@/types/report";

export function AIAssessment({ report }: { report: Report }) {
  const sif = sifColor(report.sif);
  return (
    <Card>
      <SectionHead eyebrow="AI Assessment" title="Classification" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>SIF potential</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: sif.fg }}>{report.sif}</span>
        </div>
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12.5,
              marginBottom: 4,
            }}
          >
            <span style={{ color: "var(--ink-soft)" }}>Confidence</span>
            <span style={{ fontWeight: 700 }}>{report.confidence}%</span>
          </div>
          <ProgressBar percent={report.confidence} color="var(--navy-800)" />
        </div>
        <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600, marginBottom: 6 }}>
            PRIMARY RULE
          </div>
          <Badge tone="blue">{report.rule}</Badge>
        </div>
        {report.secondary.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600, marginBottom: 6 }}>
              SECONDARY RULES
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {report.secondary.map(([name, pct]) => (
                <div
                  key={name}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}
                >
                  <span>{name}</span>
                  <span style={{ color: "var(--ink-soft)" }}>{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
