import { Icon } from "@/components/ui";
import type { Trend } from "@/types/common";

export interface TrendArrowProps {
  trend: Trend;
  pct?: number;
}

export function TrendArrow({ trend, pct }: TrendArrowProps) {
  if (trend === "up") {
    return (
      <span style={{ color: "var(--red)" }}>
        <Icon name="arrow-up-right" size="sm" /> {pct ? `+${pct}%` : "Rising"}
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span style={{ color: "var(--green)" }}>
        <Icon name="arrow-down-right" size="sm" /> {pct ? `-${Math.abs(pct)}%` : "Falling"}
      </span>
    );
  }
  return (
    <span style={{ color: "var(--ink-faint)" }}>
      <Icon name="minus" size="sm" /> Stable
    </span>
  );
}
