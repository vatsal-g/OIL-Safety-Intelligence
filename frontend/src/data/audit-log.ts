import type { AuditEvent } from "@/types/common";

export const AUDIT_LOG: AuditEvent[] = [
  { text: "Report OIL-2026-1842 escalated for investigation", by: "A. Sharma" },
  { text: "Classification confirmed for OIL-2026-1842", by: "A. Sharma" },
  { text: "Reviewer opened OIL-2026-1842", by: "A. Sharma" },
  { text: "AI classified OIL-2026-1842 as High SIF Potential", by: "System" },
  { text: "1,248 new reports ingested from Q3-safety-log.csv", by: "System" },
  { text: "Reclassified OIL-2026-1819 — secondary rule promoted to primary", by: "R. Gogoi" },
  { text: "Marked OIL-2026-1798 as false positive", by: "P. Das" },
  { text: "Pattern 'Maintenance → Energy Isolation → LOTO Gap' trend recalculated", by: "System" },
];