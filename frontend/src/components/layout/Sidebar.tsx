import { useState } from "react";
import { Icon } from "@/components/ui";
import { PrimaryNav } from "@/components/navigation/PrimaryNav";
import { SecondaryNav } from "@/components/navigation/SecondaryNav";
import { useSystemStatus, overallState } from "@/hooks/useSystemStatus";

const DOT_COLOR: Record<"up" | "degraded" | "down" | "unknown", string> = {
  up: "#3FCB78",
  degraded: "#E8A33D",
  down: "#E5484D",
  unknown: "#6B7390",
};

const DOT_LABEL: Record<"up" | "degraded" | "down" | "unknown", string> = {
  up: "AI Engine Operational",
  degraded: "AI Engine Degraded",
  down: "AI Engine Down",
  unknown: "Checking status…",
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { data } = useSystemStatus();
  const status = overallState(data);

  return (
    <div
      style={{
        width: collapsed ? 64 : 236,
        flexShrink: 0,
        background: "var(--navy-900)",
        color: "#DADFEA",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        borderRight: "1px solid var(--navy-700)",
        transition: "width .18s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "20px 0" : "20px 18px",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            background: "#1B2A4E",
            border: "1px solid #2C3C63",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="shield" style={{ color: "#7C9CE6" }} />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#fff" }}>
              OIL
            </div>
            <div style={{ fontSize: 11, color: "#9AA4BD" }}>Safety Intelligence</div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
        <PrimaryNav collapsed={collapsed} />
        <div style={{ height: 1, background: "var(--navy-700)", margin: "12px 6px" }} />
        <SecondaryNav collapsed={collapsed} />
      </div>

      <div
        style={{
          padding: collapsed ? "12px 0" : "12px 16px",
          borderTop: "1px solid var(--navy-700)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: DOT_COLOR[status],
              flexShrink: 0,
            }}
          />
          {!collapsed && <span style={{ fontSize: 11.5, color: "#B7BFD3" }}>{DOT_LABEL[status]}</span>}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="focus-ring"
          style={{
            marginTop: 10,
            background: "transparent",
            border: "none",
            color: "#6B7390",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            justifyContent: collapsed ? "center" : "flex-start",
            width: "100%",
          }}
        >
          <Icon name={collapsed ? "chevron-right" : "chevron-left"} size="sm" />
          {!collapsed && "Collapse"}
        </button>
      </div>
    </div>
  );
}