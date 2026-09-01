import { Icon } from "./Icon";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  sub?: string;
}

export function EmptyState({ icon, title, sub }: EmptyStateProps) {
  return (
    <div style={{ textAlign: "center", padding: "36px 20px", color: "var(--ink-soft)" }}>
      <Icon name={icon || "inbox"} size="lg" style={{ marginBottom: 8, opacity: 0.5 }} />
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
