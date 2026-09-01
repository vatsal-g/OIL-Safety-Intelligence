import { MetricStrip } from "../components/MetricStrip";
import { AttentionList } from "../components/AttentionList";
import { SiteDensityCard } from "../components/SiteDensityCard";
import { RuleDistributionCard } from "../components/RuleDistributionCard";
import { RecurringPatternsCard } from "../components/RecurringPatternsCard";
import { useReports } from "@/features/triage/hooks/useReports";

export function OverviewPage() {
  const { reports, loading, error } = useReports();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {error && (
        <div
          style={{
            padding: 12,
            background: "#fef2f2",
            border: "1px solid #ef4444",
            color: "#dc2626",
            borderRadius: 7,
            fontSize: 12.5,
          }}
        >
          ⚠️ Error syncing overview metrics: {error}
        </div>
      )}

      {/* Pass live reports and loading states to all components */}
      <MetricStrip reports={reports} loading={loading} />

      <AttentionList reports={reports} loading={loading} />

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18 }}>
        <SiteDensityCard reports={reports} loading={loading} />
        <RuleDistributionCard reports={reports} loading={loading} />
      </div>

      <RecurringPatternsCard reports={reports} loading={loading} />
    </div>
  );
}