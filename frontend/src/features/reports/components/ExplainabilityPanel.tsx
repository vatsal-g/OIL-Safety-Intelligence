import { Card, SectionHead, Badge } from "@/components/ui";
import type { Report } from "@/types/report";

const LAYER_LABELS: Record<string, string> = {
  layer1: "Layer 1 (Pattern Match)",
  layer2: "Layer 2 (ML Context Parser)",
  layer1_fallback: "Layer 1 (Fallback — Layer 2 unavailable)",
  unknown: "Unknown",
};

export function ExplainabilityPanel({ report }: { report: Report }) {
  // Uses report.indicators / report.layerUsed — the fields the
  // adapter actually populates. Previously this read
  // report.finalResult / report.layer1, which don't exist on the
  // adapted Report type (only on the raw backend document), so
  // evidenceTrail was always empty and layerUsed always showed
  // the hardcoded else-branch value regardless of what actually
  // resolved the report.
  const evidenceTrail = report.indicators || [];
  const layerLabel = LAYER_LABELS[report.layerUsed || "unknown"];

  return (
    <Card>
      <SectionHead eyebrow="AI Explainability" title="Classification & Evidence Trail" />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)" }}>
            Processing Engine:
          </span>
          <Badge tone="blue">{layerLabel}</Badge>
        </div>

        <div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
            Matched Evidence & Keywords:
          </span>

          {evidenceTrail.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {evidenceTrail.map((item, index) => (
                <span
                  key={index}
                  style={{
                    padding: "4px 8px",
                    background: "var(--green-bg, #f0fdf4)",
                    color: "var(--green, #166534)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  className="mono"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", fontStyle: "italic" }}>
              No specific keyword evidence matched. Classified via semantic confidence scoring.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}