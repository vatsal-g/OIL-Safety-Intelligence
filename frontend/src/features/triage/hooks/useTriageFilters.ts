import { useContext } from "react";
import { ShellContext } from "@/app/providers";

export function useTriageFilters() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useTriageFilters must be used within AppProviders");
  return { filters: ctx.filters, setFilters: ctx.setFilters };
}
