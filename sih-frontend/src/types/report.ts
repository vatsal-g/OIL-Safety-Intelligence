import type { Priority, ReportStatus, SIFLevel } from "./common";

/** A [phrase, label] pair identifying evidence text to highlight in a report. */
export type ReportHighlight = [phrase: string, label: string];

/** A [ruleName, confidencePct] pair for a secondary rule classification. */
export type SecondaryRule = [name: string, pct: number];

export interface Report {
  id: string;
  site: string;
  activity: string;
  rule: string;
  text: string;
  indicators: string[];
  highlights: ReportHighlight[];
  sif: SIFLevel;
  priority: Priority;
  confidence: number;
  status: ReportStatus;
  secondary: SecondaryRule[];
  timestamp: string;
  reviewer: string | null;
  reviewNote: string | null;
  /**
   * Which classification layer actually resolved this report —
   * "layer1" (direct keyword match), "layer2" (ML context parser),
   * or "layer1_fallback" (Layer 2 was unreachable/errored, Layer 1
   * result used instead). Optional so existing mock data (which
   * predates this field) still satisfies the type.
   */
  layerUsed?: "layer1" | "layer2" | "layer1_fallback" | "unknown";
}