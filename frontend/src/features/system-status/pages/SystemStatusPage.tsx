import { useState } from "react";
import { Card, SectionHead, Badge, Icon } from "@/components/ui";
import { useSystemStatus, overallState } from "@/hooks/useSystemStatus";
import type { SystemComponentStatus } from "@/lib/api";

const DOT_COLOR: Record<SystemComponentStatus["state"], string> = {
  up: "var(--green)",
  degraded: "var(--amber)",
  down: "var(--red)",
  not_implemented: "var(--ink-soft)",
};

const BADGE: Record<SystemComponentStatus["state"], { tone: "green" | "amber" | "red" | "neutral"; label: string }> = {
  up: { tone: "green", label: "Operational" },
  degraded: { tone: "amber", label: "Degraded" },
  down: { tone: "red", label: "Down" },
  not_implemented: { tone: "neutral", label: "Not Implemented" },
};

export function SystemStatusPage() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { data, error, loading, checking, refresh } = useSystemStatus({ autoRefresh, intervalMs: 30000 });
  const overall = overallState(data);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => setAutoRefresh((v) => !v)}
          className="focus-ring"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--line-soft)",
            background: autoRefresh ? "var(--green-bg)" : "transparent",
            color: autoRefresh ? "var(--green)" : "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: autoRefresh ? "var(--green)" : "var(--ink-soft)",
            }}
          />
          Auto-refresh every 30s: {autoRefresh ? "On" : "Off"}
        </button>
        <button
          onClick={refresh}
          disabled={checking}
          className="focus-ring"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--line-soft)",
            background: "var(--blue-bg)",
            color: "var(--blue)",
            cursor: checking ? "default" : "pointer",
            opacity: checking ? 0.6 : 1,
          }}
        >
          <Icon name="refresh-cw" size="sm" />
          {checking ? "Checking…" : "Check Now"}
        </button>
      </div>

      {loading && (
        <Card>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Checking component health…</div>
        </Card>
      )}

      {error && !data && (
        <Card>
          <div style={{ fontSize: 12.5, color: "var(--red)" }}>
            Couldn't reach the status endpoint. Try "Check Now" once the backend is reachable.
          </div>
        </Card>
      )}

      {data?.components.map((component) => {
        const badge = BADGE[component.state];
        return (
          <Card key={component.name}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: DOT_COLOR[component.state],
                  }}
                />
                <div style={{ fontSize: 14, fontWeight: 700 }}>{component.name}</div>
              </div>
              <Badge tone={badge.tone}>{badge.label}</Badge>
            </div>
            <div
              style={{
                display: "flex",
                gap: 24,
                fontSize: 12.5,
                color: "var(--ink-soft)",
                marginTop: 10,
              }}
            >
              {component.state === "not_implemented" ? (
                <span>No backend job computes this yet — nothing to report.</span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="database" size="sm" /> {component.processed.toLocaleString()} reports processed
                </span>
              )}
            </div>
          </Card>
        );
      })}

      <Card>
        <SectionHead eyebrow="Summary" title="Pipeline Health" />
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          {overall === "up" &&
            "All AI pipeline components are operational. No degraded services detected in the current reporting period."}
          {overall === "degraded" && "One or more components are degraded — check the cards above for detail."}
          {overall === "down" && "One or more components are down. Review the cards above."}
          {overall === "unknown" && "Waiting on the first status check…"}
        </div>
      </Card>
    </div>
  );
}