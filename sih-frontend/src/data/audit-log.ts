import type { AuditEvent } from "@/types/common";

export const AUDIT_LOG: AuditEvent[] = [
  { time: "17:46", text: "Report OIL-2026-1842 escalated for investigation", by: "A. Sharma" },
  { time: "17:45", text: "Classification confirmed for OIL-2026-1842", by: "A. Sharma" },
  { time: "17:44", text: "Reviewer opened OIL-2026-1842", by: "A. Sharma" },
  { time: "17:42", text: "AI classified OIL-2026-1842 as High SIF Potential", by: "System" },
  { time: "16:58", text: "1,248 new reports ingested from Q3-safety-log.csv", by: "System" },
  { time: "16:31", text: "Reclassified OIL-2026-1819 — secondary rule promoted to primary", by: "R. Gogoi" },
  { time: "15:12", text: "Marked OIL-2026-1798 as false positive", by: "P. Das" },
  { time: "14:03", text: "Pattern 'Maintenance → Energy Isolation → LOTO Gap' trend recalculated", by: "System" },
];
