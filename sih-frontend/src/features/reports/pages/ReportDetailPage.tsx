import { useParams, useNavigate } from "react-router-dom";
import { Button, Icon } from "@/components/ui";
import { useReportDetail } from "../";
import { ReportHeader } from "../components/ReportHeader";
import { OriginalReport } from "../components/OriginalReport";
import { AIAssessment } from "../components/AIAssessment";
import { PrecursorExtraction } from "../components/PrecursorExtraction";
import { ExplainabilityPanel } from "../components/ExplainabilityPanel";
import { HumanReview } from "../components/HumanReview";

export function ReportDetailPage() {
  const params = useParams<{ id?: string; reportId?: string }>();
  // Accept either :id or :reportId
  const reportId = params.id || params.reportId;
  
  const navigate = useNavigate();
  const { report, loading, error } = useReportDetail(reportId);

  if (!reportId) {
    return (
      <div style={{ padding: 24 }}>
        <Button variant="outline" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          <Icon name="arrow-left" size="sm" /> Back
        </Button>
        <div
          style={{
            padding: 16,
            background: "#fef2f2",
            border: "1px solid #ef4444",
            color: "#dc2626",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          ⚠️ No report ID provided in route parameters.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--ink-soft)" }}>
        Loading live report details from database...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ padding: 24 }}>
        <Button variant="outline" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          <Icon name="arrow-left" size="sm" /> Back
        </Button>
        <div
          style={{
            padding: 16,
            background: "#fef2f2",
            border: "1px solid #ef4444",
            color: "#dc2626",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          ⚠️ {error || "Report not found."}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <Icon name="arrow-left" size="sm" /> Back to Queue
        </Button>
      </div>

      <ReportHeader report={report} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <OriginalReport report={report} />
        <AIAssessment report={report} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <PrecursorExtraction report={report} />
        <ExplainabilityPanel report={report} />
      </div>

      <HumanReview report={report} />
    </div>
  );
}