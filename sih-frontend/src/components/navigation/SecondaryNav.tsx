import { NavLink } from "react-router-dom";
import { Icon } from "@/components/ui";
import { NAV_SECONDARY } from "./navigation.config";

export interface SecondaryNavProps {
  collapsed: boolean;
}

export function SecondaryNav({ collapsed }: SecondaryNavProps) {
  return (
    <>
      {NAV_SECONDARY.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className="focus-ring"
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "8px 10px",
            marginBottom: 2,
            borderRadius: 6,
            border: "none",
            background: isActive ? "#1B2A4E" : "transparent",
            color: isActive ? "#fff" : "#8D95AC",
            fontSize: 12.5,
            fontWeight: isActive ? 600 : 500,
            textAlign: "left",
            textDecoration: "none",
            justifyContent: collapsed ? "center" : "flex-start",
          })}
        >
          <Icon name={item.icon} size="sm" />
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      ))}
    </>
  );
}
