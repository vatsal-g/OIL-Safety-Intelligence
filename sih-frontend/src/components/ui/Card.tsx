import type { CSSProperties, ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  padded?: boolean;
  className?: string;
}

export function Card({ children, style, padded = true, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: "var(--paper-raised)",
        border: "1px solid var(--line)",
        borderRadius: 9,
        padding: padded ? 18 : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
