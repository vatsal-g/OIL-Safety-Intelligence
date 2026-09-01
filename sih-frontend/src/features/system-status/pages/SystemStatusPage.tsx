import { Card, SectionHead, Badge, Icon } from "@/components/ui";

const ENGINES = [
  { name: "Processing Engine", lastRun: "17:42 · 28 Aug", processed: "12,482" },
  { name: "SIF Classifier", lastRun: "17:42 · 28 Aug", processed: "12,482" },
  { name: "Rule Mapper", lastRun: "17:41 · 28 Aug", processed: "12,482" },
  { name: "Pattern Engine", lastRun: "16:58 · 28 Aug", processed: "8,204" },
];

export function SystemStatusPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {ENGINES.map((engine) => (
        <Card key={engine.name}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--green)",
                }}
              />
              <div style={{ fontSize: 14, fontWeight: 700 }}>{engine.name}</div>
            </div>
            <Badge tone="green">Operational</Badge>
          </div>
          <div
            style={{
              display: "flex",
              gap: 24,
              fontSize: 12.5,
              color: "var(--ink-soft)",
              marginTop: 10,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="history" size="sm" /> Last processed {engine.lastRun}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="database" size="sm" /> {engine.processed} reports processed
            </span>
          </div>
        </Card>
      ))}
      <Card>
        <SectionHead eyebrow="Summary" title="Pipeline Health" />
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          All AI pipeline components are operational. No degraded services detected in the current
          reporting period.
        </div>
      </Card>
    </div>
  );
}
