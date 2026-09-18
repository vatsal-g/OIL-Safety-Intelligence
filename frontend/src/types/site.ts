import type { BreakdownItem, Trend } from "./common";

export interface Site {
  id: string;
  name: string;
  reports: number;
  sif: number;
  density: number;
  trend: Trend;
  dominantRule: string;
  activities: BreakdownItem[];
  rules: BreakdownItem[];
  barriers: BreakdownItem[];
}
