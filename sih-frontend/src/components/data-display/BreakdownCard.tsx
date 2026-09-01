import { Card, SectionHead, HBar } from "@/components/ui";
import type { BreakdownItem } from "@/types/common";

export interface BreakdownCardProps {
  eyebrow: string;
  title: string;
  items: BreakdownItem[];
  tone?: string;
  onItemClick?: (label: string) => void;
}

export function BreakdownCard({ eyebrow, title, items, tone, onItemClick }: BreakdownCardProps) {
  const max = Math.max(...items.map(([, v]) => v), 1);
  return (
    <Card>
      <SectionHead eyebrow={eyebrow} title={title} />
      {items.map(([label, value]) => (
        <div
          key={label}
          onClick={onItemClick ? () => onItemClick(label) : undefined}
          style={{ cursor: onItemClick ? "pointer" : "default" }}
        >
          <HBar label={label} value={value} max={max} tone={tone} />
        </div>
      ))}
    </Card>
  );
}
