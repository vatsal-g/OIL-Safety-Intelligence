import type { CSSProperties, ReactNode } from "react";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  bordered?: boolean;
  valueSize?: number;
  style?: CSSProperties;
}

/** A single metric block, as used in the repeated flex-row "metric strip" cards. */
export function MetricCard({
  label,
  value,
  sub,
  bordered = true,
  valueSize = 24,
  style,
}: MetricCardProps) {
  return (
    <div
      style={{
        flex: "1 1 160px",
        padding: "16px 20px",
        borderRight: bordered ? "1px solid var(--line)" : "none",
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--ink-faint)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: valueSize, fontWeight: 800, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
