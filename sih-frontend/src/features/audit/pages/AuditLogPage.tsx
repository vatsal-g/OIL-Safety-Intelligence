import { Card, SectionHead } from "@/components/ui";
import { AUDIT_LOG } from "@/data";

export function AuditLogPage() {
  return (
    <Card>
      <SectionHead eyebrow="Accountability" title="Audit Log" />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {AUDIT_LOG.map((event, i) => (
          <div
            key={`${event.time}-${i}`}
            style={{
              display: "flex",
              gap: 14,
              padding: "10px 0",
              borderBottom: i < AUDIT_LOG.length - 1 ? "1px solid var(--line-soft)" : "none",
              fontSize: 12.5,
            }}
          >
            <span className="mono" style={{ color: "var(--ink-faint)", width: 48, flexShrink: 0 }}>
              {event.time}
            </span>
            <span style={{ flex: 1 }}>{event.text}</span>
            <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{event.by}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
