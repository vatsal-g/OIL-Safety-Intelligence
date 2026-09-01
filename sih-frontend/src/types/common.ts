export type Trend = "up" | "down" | "flat";

export type Priority = "HIGH" | "MEDIUM" | "LOW";

export type SIFLevel = "High" | "Medium" | "Low";

export type ReportStatus =
  | "New"
  | "Under Review"
  | "Confirmed"
  | "Modified"
  | "False Positive"
  | "Escalated";

export type BadgeTone = "neutral" | "red" | "amber" | "green" | "blue";

/** A generic [label, value] pair used for horizontal-bar breakdowns. */
export type BreakdownItem = [label: string, value: number];

export interface AuditEvent {
  time: string;
  text: string;
  by: string;
}

export interface Notification {
  id: string;
  text: string;
}

export interface TriageFilters {
  q: string;
  priority: "All" | Priority;
  site: string;
  rule: string;
  status: "All" | ReportStatus;
}

export const DEFAULT_TRIAGE_FILTERS: TriageFilters = {
  q: "",
  priority: "All",
  site: "All",
  rule: "All",
  status: "All",
};
