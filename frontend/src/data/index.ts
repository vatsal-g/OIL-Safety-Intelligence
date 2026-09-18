export { SITES } from "./sites";
export { RULES } from "./rules";
export { PATTERNS } from "./patterns";
export { REPORTS } from "./reports";
export { AUDIT_LOG } from "./audit-log";

import { SITES } from "./sites";
import { RULES } from "./rules";
import { PATTERNS } from "./patterns";
import { REPORTS } from "./reports";

export function findReport(id: string | undefined) {
  return REPORTS.find((r) => r.id === id);
}
export function findSite(id: string | undefined) {
  return SITES.find((s) => s.id === id);
}
export function findRule(id: string | undefined) {
  return RULES.find((r) => r.id === id);
}
export function findPattern(id: string | undefined) {
  return PATTERNS.find((p) => p.id === id);
}
export function findRuleByName(name: string | undefined) {
  return RULES.find((r) => r.name === name);
}
export function findSiteByName(name: string | undefined) {
  return SITES.find((s) => s.name === name);
}
