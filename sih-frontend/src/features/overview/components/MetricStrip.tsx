import { Card } from "@/components/ui";

interface MetricStripProps {
  reports?: Record<string, any>[];
  loading?: boolean;
}

export function MetricStrip({ reports = [], loading = false }: MetricStripProps) {
  const totalAnalyzed = reports.length;

  // SIF Potential: includes High / Medium SIF levels (ignoring case) or boolean flags
  const sifCount = reports.filter((r) => {
    const sifVal = String(r.sif || r.sifPotential || "").toLowerCase();
    return sifVal !== "" && sifVal !== "low" && sifVal !== "false" && sifVal !== "none";
  }).length;

  const sifPercentage = totalAnalyzed > 0 ? ((sifCount / totalAnalyzed) * 100).toFixed(1) : "0";

  // High Priority: matches "high" regardless of uppercase/lowercase/capitalization
  const highPriority = reports.filter((r) => {
    const priorityVal = String(r.priority || "").toLowerCase();
    return priorityVal === "high";
  }).length;

  // Awaiting Review: matches unreviewed, new, pending, or needs review statuses
  const awaitingReview = reports.filter((r) => {
    const statusVal = String(r.status || "").toLowerCase();
    if (r.reviewed === false) return true;
    return statusVal === "new" || statusVal === "pending" || statusVal === "needs review";
  }).length;

  if (loading) {
    return (
      <Card>
        <div style={{ padding: 12, fontSize: 13, color: "var(--ink-soft)" }}>
          Calculating live metrics from backend database...
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      <Card>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase" }}>
          Reports Analyzed
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
          {totalAnalyzed.toLocaleString()}
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase" }}>
          SIF Potential
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
          {sifCount.toLocaleString()}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
          {sifPercentage}% of reports
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase" }}>
          High Priority
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: "#d97706" }}>
          {highPriority}
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase" }}>
          Awaiting Review
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: "#2563eb" }}>
          {awaitingReview}
        </div>
      </Card>
    </div>
  );
}