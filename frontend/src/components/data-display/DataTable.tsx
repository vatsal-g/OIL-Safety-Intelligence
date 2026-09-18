import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
  /** Cell-level style overrides (e.g. width, whiteSpace). */
  cellStyle?: React.CSSProperties;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  fontSize?: number;
  cellPadding?: string;
}

/**
 * A minimal, generic table used for the Triage queue and Sites list. Preserves
 * the original prototype's plain HTML table styling and row-hover behavior.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  fontSize = 12.5,
  cellPadding = "10px 14px",
}: DataTableProps<T>) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize }}>
        <thead>
          <tr
            style={{
              textAlign: "left",
              color: "var(--ink-faint)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            {columns.map((col) => (
              <th
                key={col.header}
                style={{
                  padding: cellPadding,
                  fontWeight: 600,
                  borderBottom: "1px solid var(--line)",
                  whiteSpace: "nowrap",
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{
                cursor: onRowClick ? "pointer" : "default",
                borderBottom: "1px solid var(--line-soft)",
              }}
              onMouseEnter={(e) => {
                if (onRowClick) e.currentTarget.style.background = "#F7F7F5";
              }}
              onMouseLeave={(e) => {
                if (onRowClick) e.currentTarget.style.background = "transparent";
              }}
            >
              {columns.map((col) => (
                <td key={col.header} style={{ padding: cellPadding, ...col.cellStyle }}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
