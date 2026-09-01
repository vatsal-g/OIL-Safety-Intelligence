import { createContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_TRIAGE_FILTERS, type TriageFilters } from "@/types/common";

export interface ShellContextValue {
  search: string;
  setSearch: (value: string) => void;
  notifOpen: boolean;
  setNotifOpen: (value: boolean) => void;
  filters: TriageFilters;
  setFilters: (value: TriageFilters) => void;
}

export const ShellContext = createContext<ShellContextValue | null>(null);

/**
 * Holds the small amount of state that genuinely needs to be shared across
 * the app shell (header search box) and feature pages (Triage filters) —
 * everything else (e.g. sidebar collapse) stays local to its own component.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [filters, setFilters] = useState<TriageFilters>(DEFAULT_TRIAGE_FILTERS);

  const value = useMemo<ShellContextValue>(
    () => ({ search, setSearch, notifOpen, setNotifOpen, filters, setFilters }),
    [search, notifOpen, filters],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}
