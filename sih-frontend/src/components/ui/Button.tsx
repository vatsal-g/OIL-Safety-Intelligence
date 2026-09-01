import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "outline" | "ghost";

const VARIANT_STYLE: Record<ButtonVariant, CSSProperties> = {
  outline: {
    fontSize: 12,
    fontWeight: 600,
    padding: "7px 12px",
    borderRadius: 7,
    border: "1px solid var(--line)",
    background: "#fff",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  ghost: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--blue)",
    background: "none",
    border: "none",
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "outline", className, style, ...rest }: ButtonProps) {
  return (
    <button
      className={cn("focus-ring", className)}
      style={{ ...VARIANT_STYLE[variant], ...style }}
      {...rest}
    />
  );
}
