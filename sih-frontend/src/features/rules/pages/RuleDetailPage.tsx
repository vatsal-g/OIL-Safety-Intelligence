import { Link, useParams } from "react-router-dom";
import { Card, SectionHead, Icon, Badge } from "@/components/ui";
import { MetricCard, BreakdownCard, TrendArrow } from "@/components/data-display";
import { findRule, REPORTS } from "@/data";
import { useNavigation } from "@/hooks/useNavigation";

export function RuleDetailPage() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const rule = findRule(ruleId);
  const { openReport, openSite } = useNavigation();

  if (!rule) {
    return (
      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
        Rule not found.{" "}
        <Link to="/rules" style={{ color: "var(--blue)" }}>
          Back to Life-Saving Rules
        </Link>
      </div>
    );
  }

  const supportingReports = REPORTS.filter((r) => r.rule === rule.name).slice(0, 8);

  return (
    <div className="drawer-in">
      <Link
        to="/rules"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12.5,
          color: "var(--ink-soft)",
          textDecoration: "none",
          marginBottom: 14,
        }}
      >
        <Icon name="chevron-left" size="sm" /> Back to Life-Saving Rules
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700 }}>{rule.name}</div>
        <TrendArrow trend={rule.trend} />
      </div>

      <Card padded={false} style={{ display: "flex", overflow: "hidden", marginBottom: 18, flexWrap: "wrap" }}>
        <MetricCard label="Rule Percentage" value={`${rule.pct}%`} />
        <MetricCard label="Report Volume" value={rule.reports.toLocaleString()} />
        <MetricCard label="SIF Count" value={rule.sif} bordered={false} />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
        <Card>
          <SectionHead eyebrow="Exposure" title="Associated Sites" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {rule.sites.map((siteName) => (
              <button
                key={siteName}
                onClick={() => openSite(siteName.toLowerCase())}
                style={{ background: "none", border: "none", padding: 0 }}
              >
                <Badge tone="blue">{siteName}</Badge>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHead eyebrow="Context" title="Associated Activities" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {rule.activities.map((activity) => (
              <Badge key={activity}>{activity}</Badge>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ marginBottom: 18 }}>
        <BreakdownCard
          eyebrow="Root Cause"
          title="Barrier Failures"
          items={rule.barriers}
          tone="var(--amber)"
        />
      </div>

      <Card>
        <SectionHead eyebrow="Evidence" title="Supporting Reports" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {supportingReports.map((r) => (
            <button
              key={r.id}
              onClick={() => openReport(r.id)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--line-soft)",
                padding: "9px 4px",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 12.5 }}>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {r.id}
                </span>{" "}
                · {r.site}
              </span>
              <Badge tone="blue">{r.sif}</Badge>
            </button>
          ))}
          {supportingReports.length === 0 && (
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>No supporting reports found.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
