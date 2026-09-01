import { Link, useParams } from "react-router-dom";
import { Card, Icon } from "@/components/ui";
import { MetricCard, BreakdownCard, TrendArrow } from "@/components/data-display";
import { findSite, findRuleByName } from "@/data";
import { useNavigation } from "@/hooks/useNavigation";

export function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const site = findSite(siteId);
  const { openRule, goToTriageWithFilters } = useNavigation();

  if (!site) {
    return (
      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
        Site not found.{" "}
        <Link to="/sites" style={{ color: "var(--blue)" }}>
          Back to Sites
        </Link>
      </div>
    );
  }

  return (
    <div className="drawer-in">
      <Link
        to="/sites"
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
        <Icon name="chevron-left" size="sm" /> Back to Sites
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700 }}>{site.name}</div>
        <TrendArrow trend={site.trend} />
      </div>

      <Card padded={false} style={{ display: "flex", overflow: "hidden", marginBottom: 18, flexWrap: "wrap" }}>
        <MetricCard label="Reports" value={site.reports.toLocaleString()} />
        <MetricCard label="SIF Potential" value={site.sif} />
        <MetricCard label="SIF Density" value={`${site.density}%`} />
        <MetricCard
          label="Dominant Rule"
          value={
            <button
              onClick={() => {
                const rule = findRuleByName(site.dominantRule);
                if (rule) openRule(rule.id);
              }}
              style={{ background: "none", border: "none", color: "var(--blue)", fontSize: 16, fontWeight: 700 }}
            >
              {site.dominantRule}
            </button>
          }
          bordered={false}
        />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 18 }}>
        <BreakdownCard
          eyebrow="By Activity"
          title="Activity Analysis"
          items={site.activities}
          tone="var(--navy-800)"
          onItemClick={(activity) => goToTriageWithFilters({ site: site.name, q: activity })}
        />
        <BreakdownCard
          eyebrow="By Rule"
          title="Rule Analysis"
          items={site.rules}
          tone="var(--blue)"
          onItemClick={(ruleName) => goToTriageWithFilters({ site: site.name, rule: ruleName })}
        />
        <BreakdownCard eyebrow="By Barrier" title="Barrier Analysis" items={site.barriers} tone="var(--amber)" />
      </div>
    </div>
  );
}
