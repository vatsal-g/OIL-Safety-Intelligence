export interface NavItem {
  path: string;
  label: string;
  icon: string;
  /** Route path prefixes that should also mark this nav item active (e.g. detail pages). */
  matchPrefixes?: string[];
}

export const NAV_PRIMARY: NavItem[] = [
  { path: "/overview", label: "Dashboard", icon: "layout-dashboard" },
  { path: "/triage", label: "Triage", icon: "list-checks" },
  { path: "/reports", label: "Reports", icon: "files" },
  { path: "/patterns", label: "Patterns", icon: "git-branch" },
  { path: "/sites", label: "Sites", icon: "building-2" },
  { path: "/rules", label: "Life-Saving Rules", icon: "book-open" },
];

export const NAV_SECONDARY: NavItem[] = [
  { path: "/ingestion", label: "Data Ingestion", icon: "upload-cloud" },
  { path: "/audit", label: "Audit Log", icon: "history" },
  { path: "/status", label: "System Status", icon: "server" },
  { path: "/settings", label: "Settings", icon: "sliders" },
];