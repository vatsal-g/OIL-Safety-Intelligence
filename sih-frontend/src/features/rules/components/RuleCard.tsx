import { Card, Icon } from "@/components/ui";
import { TrendArrow } from "@/components/data-display";
import { useNavigation } from "@/hooks/useNavigation";
import type { Rule } from "@/types/rule";

export function RuleCard({ rule }: { rule: Rule }) {
  const { openRule } = useNavigation();
  return (
    <Card>
      <button
        onClick={() => openRule(rule.id)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          background: "transparent",
          border: "none",
          textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{rule.name}</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
            {rule.pct}% of reports · {rule.reports.toLocaleString()} reports · {rule.sif} SIF
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <TrendArrow trend={rule.trend} />
          <Icon name="chevron-right" size="sm" style={{ color: "var(--ink-faint)" }} />
        </div>
      </button>
    </Card>
  );
}
