import { Link, useParams } from "react-router-dom";
import { Card, SectionHead, Icon, Badge } from "@/components/ui";
import { BreakdownCard, TrendArrow } from "@/components/data-display";
import { findPattern, REPORTS } from "@/data";
import { useNavigation } from "@/hooks/useNavigation";
import { PatternChain } from "../components/PatternChain";

export function PatternDetailPage() {
  const { patternId } = useParams<{ patternId: string }>();
  const pattern = findPattern(patternId);
  const { openReport, openSite } = useNavigation();

  if (!pattern) {
    return (
      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
        Pattern not found.{" "}
        <Link to="/patterns" style={{ color: "var(--blue)" }}>
          Back to Patterns
        </Link>
      </div>
    );
  }

  const supportingReports = REPORTS.filter(
    (r) => r.rule === pattern.chain[pattern.chain.length - 1] || pattern.chain.includes(r.activity),
  ).slice(0, 8);

  return (
    <div className="drawer-in">
      <Link
        to="/patterns"
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
        <Icon name="chevron-left" size="sm" /> Back to Patterns
      </Link>

      <Card style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <PatternChain chain={pattern.chain} />
          <TrendArrow trend={pattern.trend} pct={pattern.trendPct} />
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 12.5, color: "var(--ink-soft)" }}>
          <span>
            <strong style={{ color: "var(--ink)" }}>{pattern.reports}</strong> reports
          </span>
          <span>
            <strong style={{ color: "var(--ink)" }}>{pattern.sites}</strong> sites
          </span>
          <span>
            Top site:{" "}
            <button
              onClick={() => {
                const site = pattern.topSite.toLowerCase();
                openSite(site);
              }}
              style={{ color: "var(--blue)", fontWeight: 600, background: "none", border: "none" }}
            >
              {pattern.topSite}
            </button>
          </span>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 18 }}>
        <BreakdownCard eyebrow="By Site" title="Site Breakdown" items={pattern.sitesBd} tone="var(--blue)" />
        <BreakdownCard
          eyebrow="By Activity"
          title="Activity Breakdown"
          items={pattern.activitiesBd}
          tone="var(--navy-800)"
        />
        <BreakdownCard
          eyebrow="By Barrier"
          title="Barrier Breakdown"
          items={pattern.barriersBd}
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
