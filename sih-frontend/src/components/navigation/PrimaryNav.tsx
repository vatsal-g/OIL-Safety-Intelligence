import { NavLink } from "react-router-dom";
import { Icon } from "@/components/ui";
import { NAV_PRIMARY } from "./navigation.config";

export interface PrimaryNavProps {
  collapsed: boolean;
}

export function PrimaryNav({ collapsed }: PrimaryNavProps) {
  return (
    <>
      {NAV_PRIMARY.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className="focus-ring"
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "9px 10px",
            marginBottom: 2,
            borderRadius: 6,
            border: "none",
            background: isActive ? "#1B2A4E" : "transparent",
            color: isActive ? "#fff" : "#B7BFD3",
            fontSize: 13,
            fontWeight: isActive ? 600 : 500,
            textAlign: "left",
            textDecoration: "none",
            justifyContent: collapsed ? "center" : "flex-start",
          })}
        >
          <Icon name={item.icon} size="md" />
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      ))}
    </>
  );
}
