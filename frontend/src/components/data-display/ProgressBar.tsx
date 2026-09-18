export interface ProgressBarProps {
  /** 0–100 */
  percent: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({
  percent,
  color = "var(--navy-800)",
  trackColor = "var(--line-soft)",
  height = 7,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      style={{
        background: trackColor,
        height,
        borderRadius: height / 2 < 2 ? 2 : 4,
        overflow: "hidden",
      }}
    >
      <div
        className="bar-fill"
        style={{ width: `${clamped}%`, height: "100%", background: color, borderRadius: 4 }}
      />
    </div>
  );
}
