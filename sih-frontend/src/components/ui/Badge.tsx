import type { ReactNode } from "react";
import type { BadgeTone } from "@/types/common";

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: "#F1F1EF", fg: "var(--ink-soft)" },
  red: { bg: "var(--red-bg)", fg: "var(--red)" },
  amber: { bg: "var(--amber-bg)", fg: "var(--amber)" },
  green: { bg: "var(--green-bg)", fg: "var(--green)" },
  blue: { bg: "var(--blue-bg)", fg: "var(--blue)" },
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  const t = TONES[tone];
  return (
    <span
      style={{
        background: t.bg,
        color: t.fg,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 5,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
