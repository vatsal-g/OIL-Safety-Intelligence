import { Card } from "@/components/ui";
import { DataTable, type DataTableColumn, TrendArrow } from "@/components/data-display";
import { SITES } from "@/data";
import { useNavigation } from "@/hooks/useNavigation";
import type { Site } from "@/types/site";

export function SiteTable() {
  const { openSite } = useNavigation();

  const columns: DataTableColumn<Site>[] = [
    { header: "Site", render: (s) => <span style={{ fontWeight: 600 }}>{s.name}</span> },
    { header: "Reports", render: (s) => s.reports.toLocaleString() },
    { header: "SIF Potential", render: (s) => s.sif },
    { header: "SIF Density", render: (s) => `${s.density}%` },
    { header: "Trend", render: (s) => <TrendArrow trend={s.trend} /> },
    { header: "Dominant Rule", render: (s) => s.dominantRule },
  ];

  return (
    <Card padded={false}>
      <DataTable
        columns={columns}
        rows={SITES}
        rowKey={(s) => s.id}
        onRowClick={(s) => openSite(s.id)}
        cellPadding="12px 16px"
      />
    </Card>
  );
}
