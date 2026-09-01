import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

export function PageContainer({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div
      className="fade-in"
      key={location.pathname}
      style={{ padding: "22px 26px", maxWidth: 1360 }}
    >
      {children}
    </div>
  );
}
