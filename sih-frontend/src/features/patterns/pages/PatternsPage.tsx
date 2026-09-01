import { PATTERNS } from "@/data";
import { PatternCard } from "../components/PatternCard";

export function PatternsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {PATTERNS.map((p) => (
        <PatternCard key={p.id} pattern={p} />
      ))}
    </div>
  );
}
