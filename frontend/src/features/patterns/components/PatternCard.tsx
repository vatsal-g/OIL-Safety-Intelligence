import { Card, Icon } from "@/components/ui";
import { TrendArrow } from "@/components/data-display";
import { useNavigation } from "@/hooks/useNavigation";
import type { Pattern } from "@/types/pattern";

export function PatternCard({ pattern }: { pattern: Pattern }) {
  const { openPattern } = useNavigation();
  return (
    <Card
      style={{ cursor: "pointer" }}
      className="focus-ring"
    >
      <button
        onClick={() => openPattern(pattern.id)}
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
          <div style={{ fontSize: 14, fontWeight: 700 }}>{pattern.chain.join(" → ")}</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
            {pattern.reports} reports · {pattern.sites} sites · top site {pattern.topSite}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <TrendArrow trend={pattern.trend} pct={pattern.trendPct} />
          <Icon name="chevron-right" size="sm" style={{ color: "var(--ink-faint)" }} />
        </div>
      </button>
    </Card>
  );
}
