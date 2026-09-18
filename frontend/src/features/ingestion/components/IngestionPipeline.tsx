import { Icon } from "@/components/ui";

const STAGES = [
  { key: "upload", label: "Upload", icon: "upload-cloud" },
  { key: "processing", label: "Processing", icon: "server" },
  { key: "classification", label: "AI Classification", icon: "shield" },
  { key: "extraction", label: "Extraction", icon: "files" },
  { key: "pattern", label: "Pattern Analysis", icon: "git-branch" },
] as const;

export interface IngestionPipelineProps {
  /** Index of the current stage; stages before it are complete, after it are pending. */
  activeIndex: number;
}

export function IngestionPipeline({ activeIndex }: IngestionPipelineProps) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {STAGES.map((stage, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={stage.key} style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: done ? "var(--green-bg)" : active ? "var(--blue-bg)" : "var(--line-soft)",
                  color: done ? "var(--green)" : active ? "var(--blue)" : "var(--ink-faint)",
                  border: active ? "2px solid var(--blue)" : "none",
                }}
              >
                <Icon name={done ? "check" : stage.icon} size="sm" />
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: active ? "var(--blue)" : done ? "var(--green)" : "var(--ink-faint)",
                  whiteSpace: "nowrap",
                }}
              >
                {stage.label}
              </div>
            </div>
            {i < STAGES.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: i < activeIndex ? "var(--green)" : "var(--line-soft)",
                  margin: "0 8px 18px",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
