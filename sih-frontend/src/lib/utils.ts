import type { BadgeTone, Priority, ReportStatus, SIFLevel } from "@/types/common";

export function sifColor(sif: SIFLevel): { bg: string; fg: string } {
  if (sif === "High") return { bg: "var(--red-bg)", fg: "var(--red)" };
  if (sif === "Medium") return { bg: "var(--amber-bg)", fg: "var(--amber)" };
  return { bg: "var(--green-bg)", fg: "var(--green)" };
}

export function priorityTone(p: Priority): BadgeTone {
  return p === "HIGH" ? "red" : p === "MEDIUM" ? "amber" : "green";
}

export function statusTone(s: ReportStatus): BadgeTone {
  if (s === "New") return "blue";
  if (s === "Confirmed") return "red";
  if (s === "Modified") return "amber";
  if (s === "False Positive") return "neutral";
  return "neutral";
}

/** Joins class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
