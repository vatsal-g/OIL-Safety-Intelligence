import type { CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Database,
  Download,
  History,
  Minus,
  Search,
  Shield,
  UploadCloud,
  BookOpen,
  Building2,
  Files,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Server,
  SlidersHorizontal,
  Inbox,
  User,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon name → Lucide component map. Preserves the same icon vocabulary as
 * the original hand-built inline SVG set so every existing call site
 * (`<Icon name="..." />`) keeps working unchanged.
 */
const ICONS: Record<string, LucideIcon> = {
  "alert-triangle": AlertTriangle,
  "arrow-up-right": ArrowUpRight,
  "arrow-down-right": ArrowDownRight,
  "arrow-right": ArrowRight,
  bell: Bell,
  check: Check,
  "check-circle-2": CheckCircle2,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  database: Database,
  download: Download,
  history: History,
  minus: Minus,
  search: Search,
  shield: Shield,
  "upload-cloud": UploadCloud,
  "book-open": BookOpen,
  "building-2": Building2,
  files: Files,
  "git-branch": GitBranch,
  "layout-dashboard": LayoutDashboard,
  "list-checks": ListChecks,
  server: Server,
  sliders: SlidersHorizontal,
  inbox: Inbox,
  user: User,
};

export type IconName = keyof typeof ICONS;

/** Pixel size + stroke width per size variant, matching original .icn / .icn-sm / .icn-lg */
const SIZE_MAP: Record<"sm" | "md" | "lg", { size: number; strokeWidth: number }> = {
  sm: { size: 13, strokeWidth: 2 },
  md: { size: 15, strokeWidth: 2 },
  lg: { size: 18, strokeWidth: 1.75 },
};

export interface IconProps {
  name: string;
  /** Visual size variant. Defaults to "md" (matches original .icn). */
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: CSSProperties;
}

/**
 * Renders a Lucide icon by name. Falls back to the "inbox" glyph for any
 * unrecognized name, matching the original prototype's fallback behavior.
 */
export function Icon({ name, size = "md", className, style }: IconProps) {
  const Component = ICONS[name] ?? Inbox;
  const { size: px, strokeWidth } = SIZE_MAP[size];
  return (
    <Component
      width={px}
      height={px}
      strokeWidth={strokeWidth}
      className={className}
      style={{ verticalAlign: "-2px", flexShrink: 0, ...style }}
    />
  );
}
