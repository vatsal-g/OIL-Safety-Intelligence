import { Card, Icon } from "@/components/ui";
import { SITES, RULES } from "@/data";
import type { TriageFilters } from "@/types/common";

export interface TriageFilterBarProps {
  filters: TriageFilters;
  setFilters: (f: TriageFilters) => void;
  resultCount: number;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="focus-ring"
      style={{
        fontSize: 12,
        padding: "6px 8px",
        borderRadius: 6,
        border: "1px solid var(--line)",
        background: "#fff",
        color: "var(--ink)",
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {label}: {o}
        </option>
      ))}
    </select>
  );
}

export function TriageFilterBar({ filters, setFilters, resultCount }: TriageFilterBarProps) {
  return (
    <Card
      padded={false}
      style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
    >
      <div style={{ position: "relative" }}>
        <Icon name="search" size="sm" style={{ position: "absolute", left: 8, top: 8, color: "var(--ink-faint)" }} />
        <input
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          placeholder="Search report text or ID…"
          className="focus-ring"
          style={{
            fontSize: 12.5,
            padding: "6px 8px 6px 26px",
            borderRadius: 6,
            border: "1px solid var(--line)",
            width: 220,
          }}
        />
      </div>
      <SelectField
        label="Priority"
        value={filters.priority}
        options={["All", "HIGH", "MEDIUM", "LOW"]}
        onChange={(v) => setFilters({ ...filters, priority: v as TriageFilters["priority"] })}
      />
      <SelectField
        label="Site"
        value={filters.site}
        options={["All", ...SITES.map((s) => s.name)]}
        onChange={(v) => setFilters({ ...filters, site: v })}
      />
      <SelectField
        label="Rule"
        value={filters.rule}
        options={["All", ...RULES.map((r) => r.name)]}
        onChange={(v) => setFilters({ ...filters, rule: v })}
      />
      <SelectField
        label="Status"
        value={filters.status}
        options={["All", "New", "Under Review", "Confirmed", "Modified", "False Positive"]}
        onChange={(v) => setFilters({ ...filters, status: v as TriageFilters["status"] })}
      />
      <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-soft)" }}>
        {resultCount} reports
      </div>
    </Card>
  );
}
