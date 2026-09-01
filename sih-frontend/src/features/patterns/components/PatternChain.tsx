import { Icon } from "@/components/ui";
import type { Pattern } from "@/types/pattern";

export function PatternChain({ chain }: { chain: Pattern["chain"] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      {chain.map((link, i) => (
        <div key={link} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              padding: "9px 14px",
              background: "var(--navy-900)",
              color: "#fff",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {link}
          </div>
          {i < chain.length - 1 && <Icon name="arrow-right" style={{ color: "var(--ink-faint)" }} />}
        </div>
      ))}
    </div>
  );
}
