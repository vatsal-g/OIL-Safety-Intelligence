import { useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ShellContext } from "@/app/providers";
import { DEFAULT_TRIAGE_FILTERS, type TriageFilters } from "@/types/common";

export function useNavigation() {
  const navigate = useNavigate();
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useNavigation must be used within AppProviders");
  const { setNotifOpen, setFilters } = ctx;

  const openReport = useCallback(
    (id: string) => {
      setNotifOpen(false);
      navigate(`/reports/${id}`);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [navigate, setNotifOpen],
  );

  const openPattern = useCallback(
    (id: string) => {
      setNotifOpen(false);
      navigate(`/patterns/${id}`);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [navigate, setNotifOpen],
  );

  const openSite = useCallback(
    (id: string) => {
      setNotifOpen(false);
      navigate(`/sites/${id}`);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [navigate, setNotifOpen],
  );

  const openRule = useCallback(
    (id: string) => {
      setNotifOpen(false);
      navigate(`/rules/${id}`);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [navigate, setNotifOpen],
  );

  const goToTriage = useCallback(() => {
    setNotifOpen(false);
    navigate("/triage");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [navigate, setNotifOpen]);

  /** Navigates to Triage pre-filtered (e.g. "view supporting reports" from a pattern/site/rule page). */
  const goToTriageWithFilters = useCallback(
    (partial: Partial<TriageFilters>) => {
      setFilters({ ...DEFAULT_TRIAGE_FILTERS, ...partial });
      goToTriage();
    },
    [setFilters, goToTriage],
  );

  return { openReport, openPattern, openSite, openRule, goToTriage, goToTriageWithFilters };
}
