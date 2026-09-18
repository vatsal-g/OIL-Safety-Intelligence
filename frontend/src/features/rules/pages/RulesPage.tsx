import { RULES } from "@/data";
import { RuleCard } from "../components/RuleCard";

export function RulesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {RULES.map((r) => (
        <RuleCard key={r.id} rule={r} />
      ))}
    </div>
  );
}
