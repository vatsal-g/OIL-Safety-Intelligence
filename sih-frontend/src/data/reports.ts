import type { Report, ReportHighlight, SecondaryRule } from "@/types/report";
import type { Priority, ReportStatus, SIFLevel } from "@/types/common";
import { SITES } from "./sites";

interface ReportTemplate {
  text: string;
  rule: string;
  activity: string;
  indicators: string[];
  highlights: ReportHighlight[];
}

const TEMPLATES: ReportTemplate[] = [
  {
    text: "During maintenance activity, worker entered the vessel without confirmation of gas testing. Permit was displayed at site but atmospheric verification entry was blank.",
    rule: "Confined Space",
    activity: "Maintenance",
    indicators: [
      "Confined-space entry",
      "Potential hazardous atmosphere",
      "Gas testing not confirmed",
      "Permit verification not mentioned",
    ],
    highlights: [
      ["entered the vessel", "Confined Space"],
      ["gas testing", "Atmospheric verification"],
      ["Permit was displayed", "Barrier concern"],
    ],
  },
  {
    text: "Technician was observed working on the pump skid while isolation tag was present, but lockout verification checklist for the second energy source was not completed before work began.",
    rule: "Energy Isolation",
    activity: "Maintenance",
    indicators: [
      "Isolation tag present but incomplete",
      "Second energy source not verified",
      "LOTO checklist gap",
      "Work commenced before verification",
    ],
    highlights: [
      ["isolation tag was present", "Partial isolation"],
      ["lockout verification checklist", "LOTO Verification"],
      ["was not completed", "Barrier concern"],
    ],
  },
  {
    text: "Contractor crew was positioned directly below a suspended load during a lifting operation. No exclusion zone barricading was visible in site photographs attached to the report.",
    rule: "Line of Fire",
    activity: "Contractor Work",
    indicators: [
      "Personnel under suspended load",
      "No exclusion zone observed",
      "Barricading absent",
      "Line-of-fire exposure",
    ],
    highlights: [
      ["directly below a suspended load", "Line of Fire"],
      ["exclusion zone barricading was visible", "Barricading Gap"],
    ],
  },
  {
    text: "Hot work was carried out near open drain during shutdown. Fire watch was assigned but gas test record for the surrounding area could not be located during the observation.",
    rule: "Hot Work",
    activity: "Shutdown",
    indicators: [
      "Hot work near open drain",
      "Fire watch assigned",
      "Gas test record missing",
      "Ignition source proximity",
    ],
    highlights: [
      ["Hot work was carried out", "Hot Work"],
      ["gas test record", "Gas Testing"],
      ["could not be located", "Barrier concern"],
    ],
  },
  {
    text: "During routine inspection at height, technician's fall arrest lanyard was observed clipped to a handrail rather than a certified anchor point.",
    rule: "Working at Height",
    activity: "Inspection",
    indicators: [
      "Incorrect anchor point used",
      "Fall arrest compromised",
      "Certified anchor not used",
    ],
    highlights: [
      ["clipped to a handrail", "Fall Protection Verification"],
      ["certified anchor point", "Anchor Point Inspection"],
    ],
  },
  {
    text: "Operator reported a near-miss where a valve was operated without confirming line pressure had been relieved, following a shift handover where isolation status was not communicated.",
    rule: "Energy Isolation",
    activity: "Operations",
    indicators: [
      "Isolation status not communicated",
      "Line pressure not confirmed",
      "Shift handover gap",
    ],
    highlights: [
      ["without confirming line pressure", "Barrier concern"],
      ["isolation status was not communicated", "Handover Gap"],
    ],
  },
  {
    text: "During drilling operations, crew member entered marked exclusion zone to retrieve equipment while rig floor lifting activity was in progress.",
    rule: "Line of Fire",
    activity: "Drilling",
    indicators: [
      "Exclusion zone breach",
      "Lifting activity in progress",
      "Personnel exposure during lift",
    ],
    highlights: [
      ["entered marked exclusion zone", "Line of Fire"],
      ["lifting activity was in progress", "Barrier concern"],
    ],
  },
  {
    text: "Maintenance crew began work on a nitrogen-purged vessel; isolation certificate referenced an earlier revision and did not reflect the current isolation point list.",
    rule: "Confined Space",
    activity: "Maintenance",
    indicators: [
      "Outdated isolation certificate",
      "Isolation point list mismatch",
      "Certificate revision gap",
    ],
    highlights: [
      ["isolation certificate referenced an earlier revision", "Barrier concern"],
      ["nitrogen-purged vessel", "Confined Space"],
    ],
  },
];

const STATUSES: ReportStatus[] = [
  "New",
  "New",
  "New",
  "Under Review",
  "Confirmed",
  "Modified",
  "False Positive",
];

const CONFIDENCE_CYCLE = [96, 94, 91, 89, 87, 84, 82, 79, 76, 71, 68];
const REVIEWERS = ["A. Sharma", "R. Gogoi", "P. Das", "N. Baruah"];

function sifForConfidence(confidence: number): SIFLevel {
  if (confidence >= 88) return "High";
  if (confidence >= 78) return "Medium";
  return "Low";
}

function priorityForSif(sif: SIFLevel): Priority {
  if (sif === "High") return "HIGH";
  if (sif === "Medium") return "MEDIUM";
  return "LOW";
}

function secondaryFor(i: number): SecondaryRule[] {
  if (i % 3 === 0) return [["Hot Work", 18], ["Other", 7]];
  if (i % 3 === 1) return [["Energy Isolation", 19], ["Other", 10]];
  return [["Line of Fire", 14], ["Other", 9]];
}

function reviewNoteFor(status: ReportStatus): string | null {
  if (status === "Confirmed") {
    return "Insufficient isolation/verification evidence in report; escalating for site follow-up.";
  }
  if (status === "Modified") {
    return "Reclassified secondary rule as primary based on report context.";
  }
  if (status === "False Positive") {
    return "Language matched pattern but activity was a planned drill, not a live report.";
  }
  return null;
}

/** Deterministically generates the prototype's demo report set. */
function generateReports(): Report[] {
  const out: Report[] = [];
  let n = 1801;
  for (let i = 0; i < 28; i++) {
    const template = TEMPLATES[i % TEMPLATES.length];
    const site = SITES[i % SITES.length].name;
    const confidence = CONFIDENCE_CYCLE[i % CONFIDENCE_CYCLE.length];
    const sif = sifForConfidence(confidence);
    const priority = priorityForSif(sif);
    const status = STATUSES[i % STATUSES.length];

    out.push({
      id: `OIL-2026-${n++}`,
      site,
      activity: template.activity,
      rule: template.rule,
      text: template.text,
      indicators: template.indicators,
      highlights: template.highlights,
      sif,
      priority,
      confidence,
      status,
      secondary: secondaryFor(i),
      timestamp: `${27 - (i % 3)} Aug 2026 · ${(9 + (i % 9)).toString().padStart(2, "0")}:${(10 + i * 7) % 60}`,
      reviewer: status !== "New" ? REVIEWERS[i % REVIEWERS.length] : null,
      reviewNote: reviewNoteFor(status),
    });
  }
  return out;
}

export const REPORTS: Report[] = generateReports();
