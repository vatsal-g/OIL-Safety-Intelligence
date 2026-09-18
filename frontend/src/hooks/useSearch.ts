import { useContext } from "react";
import { ShellContext } from "@/app/providers";

export function useSearch() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useSearch must be used within AppProviders");
  return { search: ctx.search, setSearch: ctx.setSearch };
}
