import type { BreakdownItem, Trend } from "./common";

export interface Rule {
  id: string;
  name: string;
  pct: number;
  reports: number;
  sif: number;
  sites: string[];
  activities: string[];
  barriers: BreakdownItem[];
  trend: Trend;
}
