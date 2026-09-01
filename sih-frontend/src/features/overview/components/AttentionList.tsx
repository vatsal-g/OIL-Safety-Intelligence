import { Card, SectionHead, Icon } from "@/components/ui";
import { useNavigation } from "@/hooks/useNavigation";

interface AttentionListProps {
  reports?: any[];
  loading?: boolean;
}

export function AttentionList({ reports = [], loading = false }: AttentionListProps) {
  const { goToTriage, openSite, openPattern } = useNavigation();

  // Dynamic values calculated from backend reports
  const highPriorityCount = reports.filter((r) => r.priority === "HIGH").length;
  const uncertainCount = reports.filter(
    (r) => typeof r.confidenceScore === "number" && r.confidenceScore < 0.7
  ).length;

  const attention: Array<{ text: string; action: () => void }> = [
    {
      text: `${highPriorityCount} high-priority report${highPriorityCount === 1 ? "" : "s"} awaiting review`,
      action: goToTriage,
    },
    {
      text: "Energy Isolation precursor increasing at Digboi",
      action: () => openSite("digboi"),
    },
    {
      text: "Confined Space pattern emerging at Baghjan",
      action: () => openPattern("p2"),
    },
    {
      text: `${uncertainCount} report${uncertainCount === 1 ? "" : "s"} have uncertain AI classification and require verification`,
      action: goToTriage,
    },
  ];

  if (loading) {
    return (
      <Card>
        <SectionHead eyebrow="Signal" title="Attention" />
        <div style={{ padding: "12px 4px", fontSize: 13, color: "var(--ink-soft)" }}>
          Loading attention signals...
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHead eyebrow="Signal" title="Attention" />
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {attention.map((a, i) => (
          <button
            key={a.text}
            onClick={a.action}
            className="focus-ring"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              textAlign: "left",
              padding: "11px 4px",
              background: "transparent",
              border: "none",
              borderBottom: i < attention.length - 1 ? "1px solid var(--line-soft)" : "none",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <Icon name="alert-triangle" size="sm" style={{ color: "var(--amber)" }} />
              {a.text}
            </span>
            <Icon name="chevron-right" size="sm" style={{ color: "var(--ink-faint)" }} />
          </button>
        ))}
      </div>
    </Card>
  );
}