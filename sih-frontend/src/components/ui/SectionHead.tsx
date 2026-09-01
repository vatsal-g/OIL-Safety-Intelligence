import type { CSSProperties, ReactNode } from "react";

export interface SectionHeadProps {
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
}

export function SectionHead({ eyebrow, title, action, style }: SectionHeadProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: 14,
        ...style,
      }}
    >
      <div>
        {eyebrow && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.6,
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              marginBottom: 3,
            }}
          >
            {eyebrow}
          </div>
        )}
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
      </div>
      {action}
    </div>
  );
}
