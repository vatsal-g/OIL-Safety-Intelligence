import type { Report } from "@/types/report";
import type { SIFLevel, Priority, ReportStatus } from "@/types/common";

interface BackendReportShape {
  id?: string;
  _id?: string;
  rawText?: string;
  siteId?: string | null;
  activityTag?: string | null;
  createdAt?: string;
  rule?: string | null;
  sif?: boolean | string | null;
  priority?: Priority | string | null;
  confidence?: number | null;
  status?: string | null;
  layer1?: {
    matched?: boolean;
    matchedIogpRules?: string[];
    matchedRuleId?: string | null;
  } | null;
  layer2?: {
    invoked?: boolean;
    action?: string | null;
    object?: string | null;
    controlDeficiency?: string | null;
    confidenceScore?: number | null;
    reconstructedHazard?: string | null;
  } | null;
  finalResult?: {
    classification?: string;
    iogpRule?: string | null;
    reviewStatus?: string;
    evidenceTrail?: string[];
    layerUsed?: string;
  } | null;
}

/**
 * SIF severity level. Handles top-level boolean/string overrides
 * or derives level based on the layer and confidence.
 */
function deriveSifLevel(raw: BackendReportShape): SIFLevel {
  const isSif =
    raw.sif === true ||
    raw.finalResult?.classification === "SIF_Potential" ||
    raw.sif === "High";

  if (!isSif) return "Low";

  if (raw.layer1?.matched) return "High"; // deterministic keyword match

  const confidence = raw.layer2?.confidenceScore ?? (raw.confidence ? raw.confidence / 100 : 0);
  if (confidence >= 0.85) return "High";
  if (confidence >= 0.7) return "Medium";
  return "Medium";
}

/** Priority mirrors the SIF level, uppercased to match the Priority type + filter dropdown. */
function derivePriority(raw: BackendReportShape, sifLevel: SIFLevel): Priority {
  if (raw.priority === "HIGH" || raw.priority === "MEDIUM" || raw.priority === "LOW") {
    return raw.priority;
  }
  return sifLevel.toUpperCase() as Priority;
}

function deriveConfidence(raw: BackendReportShape): number {
  if (typeof raw.confidence === "number" && raw.confidence > 0) {
    return raw.confidence;
  }
  if (raw.layer1?.matched) return 95;
  
  const score = raw.layer2?.confidenceScore;
  if (score != null && score > 0) return Math.round(score * 100);
  
  return raw.layer2?.invoked ? 75 : 50;
}

/**
 * Maps backend reviewStatus / top-level status to valid ReportStatus union values.
 */
function deriveStatus(raw: BackendReportShape): ReportStatus {
  const rawStatus = (raw.finalResult?.reviewStatus || raw.status || "").toLowerCase();

  switch (rawStatus) {
    case "reviewed":
    case "confirmed":
      return "Confirmed";
    case "dismissed":
    case "false positive":
    case "false_positive":
      return "False Positive";
    case "under review":
    case "under_review":
      return "Under Review";
    case "modified":
      return "Modified";
    case "escalated":
      return "Escalated";
    case "pending":
    case "new":
    default:
      return "New";
  }
}

/**
 * Derives the active Rule title safely from finalResult, top-level rule, or Layer 2 action/object.
 */
function deriveRule(raw: BackendReportShape): string {
  if (raw.finalResult?.iogpRule && raw.finalResult.iogpRule !== "Unclassified") {
    return raw.finalResult.iogpRule;
  }
  if (raw.rule && raw.rule !== "Unclassified") {
    return raw.rule;
  }
  if (raw.layer2?.action) {
    // Format "fluid_recirculation" -> "Fluid Recirculation"
    return raw.layer2.action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return "Hazard Identification";
}

export function mapBackendReport(raw: BackendReportShape): Report {
  const sifLevel = deriveSifLevel(raw);
  const derivedRule = deriveRule(raw);

  // Extract evidence trail or synthesize from Layer 2 reconstructed hazard
  const evidenceTrail =
    raw.finalResult?.evidenceTrail && raw.finalResult.evidenceTrail.length > 0
      ? raw.finalResult.evidenceTrail
      : raw.layer2?.reconstructedHazard
      ? [raw.layer2.reconstructedHazard]
      : [];

  return {
    id: raw.id || raw._id || "",
    site: raw.siteId || "Baghjan",
    activity: raw.activityTag || "Unspecified",
    rule: derivedRule,
    text: raw.rawText || "No description provided",
    indicators: evidenceTrail,
    highlights: evidenceTrail.map(
      (phrase) => [phrase, derivedRule] as [string, string]
    ),
    sif: sifLevel,
    priority: derivePriority(raw, sifLevel),
    confidence: deriveConfidence(raw),
    status: deriveStatus(raw),
    secondary: [],
    timestamp: raw.createdAt || new Date().toISOString(),
    reviewer: null,
    reviewNote: null,
    layerUsed:
      (raw.finalResult?.layerUsed as Report["layerUsed"]) ||
      (raw.layer2?.invoked ? "layer2" : "layer1"),
  };
}

export function mapBackendReports(raws: BackendReportShape[]): Report[] {
  if (!Array.isArray(raws)) return [];
  return raws.map(mapBackendReport);
}