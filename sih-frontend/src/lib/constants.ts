/**
 * Page title/subtitle copy keyed by route "section" — the top-level route
 * segment a given path belongs to (e.g. both /reports and /reports/:id
 * belong to the "reports"/"report" sections respectively).
 */
export const PAGE_TITLES: Record<string, [title: string, subtitle: string]> = {
  overview: ["Overview", "OIL-wide safety signal overview"],
  triage: [
    "AI Triage Queue",
    "Review reports prioritized by SIF potential, evidence strength and safety relevance",
  ],
  reports: ["Reports", "All ingested safety observations"],
  report: ["Report Intelligence", "Source text, AI assessment and human review"],
  patterns: [
    "Precursor Pattern Intelligence",
    "Discover recurring relationships between activities, hazards, locations and barrier failures",
  ],
  pattern: ["Pattern Detail", "Relationship, evidence and supporting reports"],
  sites: ["Site Safety Intelligence", "Where SIF-precursor exposure is concentrated"],
  site: ["Site Intelligence", "Site-level safety signal"],
  rules: ["Life-Saving Rules Intelligence", "Rule-level analysis across sites and activities"],
  rule: ["Rule Intelligence", "Detail for a single Life-Saving Rule"],
  ingestion: [
    "Data Ingestion",
    "Bring free-text safety reports into the intelligence pipeline",
  ],
  audit: ["Audit Log", "Accountability trail for AI classifications and human decisions"],
  status: ["System Status", "AI pipeline health"],
  settings: ["Settings", "Workspace preferences"],
};

/** Maps a route pathname (e.g. "/reports/OIL-2026-1801") to its PAGE_TITLES section key. */
export function getPageSection(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const base = segments[0] || "overview";
  const hasDetailId = segments.length > 1;
  const DETAIL_SECTION: Record<string, string> = {
    reports: "report",
    patterns: "pattern",
    sites: "site",
    rules: "rule",
  };
  if (hasDetailId && DETAIL_SECTION[base]) return DETAIL_SECTION[base];
  return base;
}
