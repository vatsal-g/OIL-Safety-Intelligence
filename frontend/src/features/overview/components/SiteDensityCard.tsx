import { useState } from "react";
import { Card, SectionHead, HBar } from "@/components/ui";
import { TrendArrow } from "@/components/data-display";
import { SITES } from "@/data";
import { useNavigation } from "@/hooks/useNavigation";

type DensityMode = "density" | "volume" | "trend";
const MODES: DensityMode[] = ["density", "volume", "trend"];

interface SiteDensityCardProps {
  reports?: Record<string, any>[];
  loading?: boolean;
}

export function SiteDensityCard({ reports = [], loading = false }: SiteDensityCardProps) {
  const [mode, setMode] = useState<DensityMode>("density");
  const { openSite } = useNavigation();

  if (loading) {
    return (
      <Card>
        <SectionHead eyebrow="Sites" title="SIF Precursor Density by Site" />
        <div style={{ padding: "12px 0", fontSize: 13, color: "var(--ink-soft)" }}>
          Loading site density...
        </div>
      </Card>
    );
  }

  const total = reports.length || 1;

  // Derive dynamic site metrics if reports exist
  const siteCounts = reports.reduce((acc: Record<string, number>, r: Record<string, any>) => {
    const siteName = r.site || "Baghjan";
    acc[siteName] = (acc[siteName] || 0) + 1;
    return acc;
  }, {});

  const dynamicSites =
    reports.length > 0
      ? Object.entries(siteCounts).map(([name, count]: [string, number]) => ({
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name,
          sif: count,
          density: Number(((count / total) * 100).toFixed(1)),
          trend: "up" as const,
        }))
      : SITES;

  const maxDensity = Math.max(...dynamicSites.map((s) => s.density), 1);
  const maxVolume = Math.max(...dynamicSites.map((s) => s.sif), 1);
  const sorted = [...dynamicSites].sort((a, b) => b.density - a.density);

  return (
    <Card>
      <SectionHead
        eyebrow="Sites"
        title="SIF Precursor Density by Site"
        action={
          <div style={{ display: "flex", gap: 4, background: "var(--line-soft)", borderRadius: 6, padding: 2 }}>
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  padding: "4px 9px",
                  borderRadius: 5,
                  border: "none",
                  background: mode === m ? "#fff" : "transparent",
                  boxShadow: mode === m ? "0 1px 2px rgba(0,0,0,.08)" : "none",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        }
      />
      {sorted.map((s) => (
        <div key={s.id} onClick={() => openSite(s.id)} style={{ cursor: "pointer" }}>
          {mode === "density" && (
            <HBar label={s.name} value={s.density} max={maxDensity + 2} tone="var(--navy-800)" />
          )}
          {mode === "volume" && (
            <HBar label={s.name} value={s.sif} max={maxVolume + 10} tone="var(--blue)" />
          )}
          {mode === "trend" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontSize: 12.5 }}>
              <div style={{ width: 110, color: "var(--ink-soft)" }}>{s.name}</div>
              <TrendArrow trend={s.trend} />
            </div>
          )}
        </div>
      ))}
      <div
        style={{
          fontSize: 11.5,
          color: "var(--ink-faint)",
          marginTop: 6,
          borderTop: "1px solid var(--line-soft)",
          paddingTop: 10,
        }}
      >
        Density shown alongside sample size to avoid comparing small samples against large ones directly.
      </div>
    </Card>
  );
}