import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";

import { OverviewPage } from "@/features/overview/pages/OverviewPage";
import { TriagePage } from "@/features/triage/pages/TriagePage";
import { ReportsPage } from "@/features/reports/pages/ReportsPage";
import { ReportDetailPage } from "@/features/reports/pages/ReportDetailPage";
import { PatternsPage } from "@/features/patterns/pages/PatternsPage";
import { PatternDetailPage } from "@/features/patterns/pages/PatternDetailPage";
import { SitesPage } from "@/features/sites/pages/SitesPage";
import { SiteDetailPage } from "@/features/sites/pages/SiteDetailPage";
import { RulesPage } from "@/features/rules/pages/RulesPage";
import { RuleDetailPage } from "@/features/rules/pages/RuleDetailPage";
import { IngestionPage } from "@/features/ingestion/pages/IngestionPage";
import { AuditLogPage } from "@/features/audit/pages/AuditLogPage";
import { SystemStatusPage } from "@/features/system-status/pages/SystemStatusPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/triage" element={<TriagePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/:reportId" element={<ReportDetailPage />} />
          <Route path="/patterns" element={<PatternsPage />} />
          <Route path="/patterns/:patternId" element={<PatternDetailPage />} />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/sites/:siteId" element={<SiteDetailPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/rules/:ruleId" element={<RuleDetailPage />} />
          <Route path="/ingestion" element={<IngestionPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/status" element={<SystemStatusPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* No /assistant route: the AI Assistant module has been removed. */}
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
