export interface HBarProps {
  label: string;
  value: number;
  max: number;
  tone?: string;
  suffix?: string;
}

export function HBar({ label, value, max, tone = "var(--navy-800)", suffix = "%" }: HBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div style={{ width: 110, fontSize: 12.5, color: "var(--ink-soft)", flexShrink: 0 }}>
        {label}
      </div>
      <div
        style={{
          flex: 1,
          background: "var(--line-soft)",
          borderRadius: 4,
          height: 8,
          overflow: "hidden",
        }}
      >
        <div
          className="bar-fill"
          style={{ width: pct + "%", height: "100%", background: tone, borderRadius: 4 }}
        />
      </div>
      <div style={{ width: 44, fontSize: 12.5, fontWeight: 600, textAlign: "right", flexShrink: 0 }}>
        {value}
        {suffix}
      </div>
    </div>
  );
}
