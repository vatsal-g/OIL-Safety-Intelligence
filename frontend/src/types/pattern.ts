import type { BreakdownItem, Trend } from "./common";

export interface Pattern {
  id: string;
  chain: string[];
  reports: number;
  sites: number;
  trend: Trend;
  trendPct: number;
  topSite: string;
  sitesBd: BreakdownItem[];
  activitiesBd: BreakdownItem[];
  barriersBd: BreakdownItem[];
}
