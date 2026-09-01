import { Card, SectionHead, Icon } from "@/components/ui";

const PRINCIPLES = [
  {
    title: "Data provenance",
    body: "Every report retains a link back to its original source text and ingestion batch. Nothing is summarized away before it reaches a human reviewer.",
  },
  {
    title: "Review history",
    body: "Every classification a human confirms, modifies, or rejects is recorded permanently in the audit log, alongside who made the decision and when.",
  },
  {
    title: "Auditability",
    body: "The reasoning path from source text to detected indicator to rule classification is visible and traceable at every step.",
  },
  {
    title: "Model uncertainty",
    body: "Confidence scores are shown alongside every AI classification so reviewers can calibrate how much weight to give a given assessment.",
  },
  {
    title: "AI does not replace human judgement",
    body: "The system is designed to prioritize and surface evidence for human safety reviewers — not to make final safety determinations on its own.",
  },
];

export function SettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <SectionHead eyebrow="Governance" title="Governance Principles" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {PRINCIPLES.map((p) => (
            <div key={p.title} style={{ display: "flex", gap: 10 }}>
              <Icon name="shield" size="sm" style={{ color: "var(--blue)", marginTop: 3, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.5 }}>
                  {p.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHead eyebrow="Workspace" title="Preferences" />
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          Workspace-level preferences (notification cadence, default filters, export format) will
          appear here once connected to a backend.
        </div>
      </Card>
    </div>
  );
}
