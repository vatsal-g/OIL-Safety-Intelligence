import { useState, useRef } from "react";
import { Card, SectionHead, Icon, Button, Badge } from "@/components/ui";
import { IngestionPipeline } from "../components/IngestionPipeline";
import { useIngestionPipeline } from "../hooks/useIngestionPipeline";
import { fetchApi } from "@/lib/api";

export function IngestionPage() {
  const { running, activeIndex, complete, start, reset, ingestData } = useIngestionPipeline();

  // Single Report Classification State
  const [rawText, setRawText] = useState("");
  const [siteId, setSiteId] = useState("Digboi");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classificationResult, setClassificationResult] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // CSV File Ingestion State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single Submission Handler
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setClassificationResult(null);

    try {
      const response = await fetchApi<any>("/reports/classify", {
        method: "POST",
        body: JSON.stringify({
          rawText: rawText.trim(),
          siteId,
        }),
      });

      setClassificationResult(response);
      setRawText("");
    } catch (err: any) {
      console.error("Live classification error:", err);
      setSubmitError(err.message || "Failed to classify observation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle CSV File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Parse CSV & Run Active Ingestion Pipeline
  const handleStartIngestion = () => {
    if (!selectedFile) {
      start(); // Fallback to simulation run if no CSV is uploaded
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r\n|\n/);
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      const parsedRecords: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        parsedRecords.push(row);
      }

      if (ingestData) {
        await ingestData(parsedRecords);
      } else {
        start();
      }
    };

    reader.readAsText(selectedFile);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 1. Live Single Report Submission & Classification Form */}
      <Card>
        <SectionHead eyebrow="Live AI Engine" title="Submit Single Safety Observation" />
        <form onSubmit={handleSingleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4, display: "block" }}>
                Select Site Location
              </label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--bg-surface)",
                  fontSize: 13,
                }}
              >
                <option value="Digboi">Digboi</option>
                <option value="Baghjan">Baghjan</option>
                <option value="Duliajan">Duliajan</option>
                <option value="Moran">Moran</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4, display: "block" }}>
              Observation Raw Text
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g., Gas leak smell detected near isolation valve without permit..."
              rows={3}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: "var(--bg-surface)",
                fontSize: 13,
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="outline" type="submit" disabled={isSubmitting || !rawText.trim()}>
              <Icon name="upload-cloud" size="sm" />
              {isSubmitting ? "Classifying with Backend AI..." : "Submit & Classify"}
            </Button>
          </div>
        </form>

        {/* Display Live Classification Result */}
        {classificationResult && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: "var(--green-bg)",
              border: "1px solid var(--green)",
              borderRadius: 7,
              fontSize: 12.5,
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>
              ✅ Successfully Ingested & Classified in MongoDB!
            </div>
            <div>
              <strong>Report ID:</strong> <span className="mono">{classificationResult.id}</span>
            </div>
            <div>
              <strong>Classification:</strong> {classificationResult.finalResult?.classification}
            </div>
            <div>
              <strong>Processed By:</strong> {classificationResult.finalResult?.layerUsed}
            </div>
          </div>
        )}

        {/* Display Error Message */}
        {submitError && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: "#fef2f2",
              border: "1px solid #ef4444",
              color: "#dc2626",
              borderRadius: 7,
              fontSize: 12.5,
            }}
          >
            ⚠️ {submitError}
          </div>
        )}
      </Card>

      {/* 2. Simulation & Active Pipeline Status */}
      <Card>
        <SectionHead
          eyebrow="Pipeline"
          title="Ingestion Status"
          action={
            complete ? (
              <Button variant="outline" onClick={reset}>
                Run Again
              </Button>
            ) : (
              <Button variant="outline" onClick={handleStartIngestion} disabled={running}>
                <Icon name="upload-cloud" size="sm" /> {running ? "Processing…" : selectedFile ? "Ingest CSV to MongoDB" : "Simulate Ingestion"}
              </Button>
            )
          }
        />
        <IngestionPipeline activeIndex={complete ? 5 : activeIndex} />
        {complete && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "var(--green-bg)",
              color: "var(--green)",
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Reports successfully processed, classified, and persisted to MongoDB!
          </div>
        )}
      </Card>

      {/* 3. Real CSV File Dropzone */}
      <Card>
        <SectionHead eyebrow="Upload" title="Bring in new reports" />
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "1.5px dashed var(--line)",
            borderRadius: 9,
            padding: "34px 20px",
            textAlign: "center",
            color: "var(--ink-soft)",
            cursor: "pointer",
            background: selectedFile ? "var(--bg-surface)" : "transparent",
          }}
        >
          <Icon name="upload-cloud" size="lg" style={{ marginBottom: 8, opacity: 0.6 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            {selectedFile ? `Selected: ${selectedFile.name}` : "Click to select or drag & drop a CSV"}
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {selectedFile ? "Ready for batch ingestion. Click 'Ingest CSV to MongoDB' above." : "Free-text safety observation reports · one row per report"}
          </div>
        </div>
      </Card>

      {/* 4. Ingestion History */}
      <Card>
        <SectionHead eyebrow="History" title="Recent Ingestions" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            ["January2015toNovember2025.csv", "105,996 reports", "Ready"],
            ["Q3-safety-log.csv", "1,248 reports", "Complete"],
            ["shift-reports-aug.csv", "486 reports", "Complete"],
            ["contractor-obs-2026.csv", "912 reports", "Complete"],
          ].map(([name, count, status]) => (
            <div
              key={name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12.5,
                padding: "8px 0",
                borderBottom: "1px solid var(--line-soft)",
              }}
            >
              <span className="mono">{name}</span>
              <span style={{ color: "var(--ink-soft)" }}>{count}</span>
              <Badge tone={status === "Complete" ? "green" : "blue"}>{status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}