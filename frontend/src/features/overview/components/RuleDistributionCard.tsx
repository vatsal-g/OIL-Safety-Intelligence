import { Card, SectionHead, HBar } from "@/components/ui";
import { RULES } from "@/data";
import { useNavigation } from "@/hooks/useNavigation";

interface RuleDistributionCardProps {
  reports?: Record<string, any>[];
  loading?: boolean;
}

export function RuleDistributionCard({ reports = [], loading = false }: RuleDistributionCardProps) {
  const { openRule } = useNavigation();

  if (loading) {
    return (
      <Card>
        <SectionHead eyebrow="Rules" title="Life-Saving Rule Distribution" />
        <div style={{ padding: "12px 0", fontSize: 13, color: "var(--ink-soft)" }}>
          Loading rule distribution...
        </div>
      </Card>
    );
  }

  const total = reports.length || 1;

  // Normalize and group backend report rules
  const dynamicRulesMap = reports.reduce((acc: Record<string, number>, r: Record<string, any>) => {
    const rawRule = r.rule || r.primaryRule || "Unclassified";
    // Clean whitespace and capitalize uniformly for clean UI display
    const ruleName = String(rawRule).trim();
    acc[ruleName] = (acc[ruleName] || 0) + 1;
    return acc;
  }, {});

  const rulesData =
    reports.length > 0
      ? Object.entries(dynamicRulesMap).map(([name, count]: [string, number]) => ({
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name,
          pct: Number(((count / total) * 100).toFixed(1)),
        }))
      : RULES;

  const maxPct = Math.max(...rulesData.map((r) => r.pct), 35);

  return (
    <Card>
      <SectionHead eyebrow="Rules" title="Life-Saving Rule Distribution" />
      {rulesData.map((r, idx) => {
        // Guarantee key uniqueness even if duplicated names exist
        const uniqueKey = `${r.id}-${idx}`;
        return (
          <div key={uniqueKey} onClick={() => openRule(r.id)} style={{ cursor: "pointer" }}>
            <HBar label={r.name} value={r.pct} max={maxPct} tone="var(--blue)" />
          </div>
        );
      })}
    </Card>
  );
}