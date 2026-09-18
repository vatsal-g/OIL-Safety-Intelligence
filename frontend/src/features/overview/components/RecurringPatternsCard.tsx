import { useNavigate } from "react-router-dom";
import { Card, SectionHead, Icon, Button } from "@/components/ui";
import { TrendArrow } from "@/components/data-display";
import { PATTERNS } from "@/data";
import { useNavigation } from "@/hooks/useNavigation";

interface RecurringPatternsCardProps {
  reports?: any[];
  loading?: boolean;
}

export function RecurringPatternsCard({ reports = [], loading = false }: RecurringPatternsCardProps) {
  const { openPattern } = useNavigation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <SectionHead eyebrow="Recurring" title="Recurring Patterns" />
        <div style={{ padding: "12px 4px", fontSize: 13, color: "var(--ink-soft)" }}>
          Analyzing precursors across backend reports...
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHead
        eyebrow="Recurring"
        title="Recurring Patterns"
        action={
          <Button variant="ghost" onClick={() => navigate("/patterns")}>
            View all <Icon name="chevron-right" size="sm" />
          </Button>
        }
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {PATTERNS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => openPattern(p.id)}
            className="focus-ring"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              textAlign: "left",
              padding: "12px 4px",
              background: "transparent",
              border: "none",
              borderBottom: i < PATTERNS.length - 1 ? "1px solid var(--line-soft)" : "none",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.chain.join(" → ")}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3 }}>
                {p.reports} reports · {p.sites} sites · <TrendArrow trend={p.trend} pct={p.trendPct} />
              </div>
            </div>
            <Icon name="chevron-right" size="sm" style={{ color: "var(--ink-faint)" }} />
          </button>
        ))}
      </div>
    </Card>
  );
}