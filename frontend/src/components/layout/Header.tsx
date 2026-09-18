import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "@/components/ui";
import { UserMenu } from "./UserMenu";
import { useSearch } from "@/hooks/useSearch";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigation } from "@/hooks/useNavigation";
import { useTriageFilters } from "@/features/triage/hooks/useTriageFilters";
import { PAGE_TITLES, getPageSection } from "@/lib/constants";
import type { Notification } from "@/types/common";

export function Header() {
  const location = useLocation();
  const [title, sub] = PAGE_TITLES[getPageSection(location.pathname)] || ["", ""];
  const { search, setSearch } = useSearch();
  const { notifOpen, setNotifOpen, notifications } = useNotifications();
  const { goToTriage } = useNavigation();
  const { filters, setFilters } = useTriageFilters();
  const [hoveredNotif, setHoveredNotif] = useState<string | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);

  // Sync search query live with triage filter state
  useEffect(() => {
    setFilters({ ...filters, q: search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Handle clicking outside to close notification menu automatically
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifOpen, setNotifOpen]);

  const handleSearchSubmit = () => {
    if (search.trim()) {
      goToTriage();
    }
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "rgba(250,250,248,.92)",
        backdropFilter: "blur(6px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 26px",
          gap: 20,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 1 }}>{sub}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {/* Header Search Input Bar */}
          <div style={{ position: "relative" }}>
            <Icon
              name="search"
              size="sm"
              style={{ position: "absolute", left: 10, top: 9, color: "var(--ink-faint)" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearchSubmit();
              }}
              placeholder="Search reports, sites, rules, precursors…"
              className="focus-ring"
              style={{
                width: 280,
                fontSize: 12.5,
                padding: "7px 10px 7px 30px",
                borderRadius: 7,
                border: "1px solid var(--line)",
                background: "#fff",
              }}
            />
          </div>

          {/* Notifications Dropdown */}
          <div style={{ position: "relative" }} ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="focus-ring"
              style={{
                position: "relative",
                background: "#fff",
                border: "1px solid var(--line)",
                borderRadius: 7,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Icon name="bell" size="sm" />
              {notifications && notifications.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    background: "var(--red, #e53e3e)",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 8,
                    padding: "1px 4px",
                  }}
                >
                  {notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                className="fade-in"
                style={{
                  position: "absolute",
                  right: 0,
                  top: 38,
                  width: 290,
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: 9,
                  boxShadow: "0 8px 24px rgba(0,0,0,.09)",
                  padding: 6,
                  zIndex: 30,
                }}
              >
                {!notifications || notifications.length === 0 ? (
                  <div style={{ padding: 10, fontSize: 12, color: "var(--ink-soft)", textAlign: "center" }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map((n: Notification) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setNotifOpen(false);
                        goToTriage();
                      }}
                      onMouseEnter={() => setHoveredNotif(String(n.id))}
                      onMouseLeave={() => setHoveredNotif(null)}
                      style={{
                        padding: "9px 10px",
                        fontSize: 12.5,
                        borderRadius: 6,
                        cursor: "pointer",
                        lineHeight: 1.4,
                        background: hoveredNotif === String(n.id) ? "#F5F5F3" : "transparent",
                      }}
                    >
                      {n.text}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 22, background: "var(--line)" }} />
          <UserMenu />
        </div>
      </div>
    </div>
  );
}