import { useState,useContext } from "react";
import { ShellContext } from "@/app/providers";
import type { Notification } from "@/types/common";

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: "n1", text: "3 high-priority SIF reports awaiting review" },
  { id: "n2", text: "Energy Isolation pattern increased 18% across 3 sites" },
  { id: "n3", text: "12 reports require classification verification" },
  { id: "n4", text: "1,248 new reports processed" },
];

const STORAGE_KEY = "read_notification_ids";

export function useNotifications() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useNotifications must be used within AppProviders");

  // Load read notification IDs from localStorage on initial render
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Calculate unread badge count
  const unreadCount = INITIAL_NOTIFICATIONS.filter(
    (n) => !readIds.includes(n.id)
  ).length;

  const setNotifOpen = (open: boolean) => {
    ctx.setNotifOpen(open);

    // When popover is opened, mark all current notifications as read
    if (open && unreadCount > 0) {
      const allIds = INITIAL_NOTIFICATIONS.map((n) => n.id);
      setReadIds(allIds);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
      } catch (err) {
        console.error("Failed to save read notifications:", err);
      }
    }
  };

  return {
    notifOpen: ctx.notifOpen,
    setNotifOpen,
    notifications: INITIAL_NOTIFICATIONS,
    unreadCount,
    readIds,
  };
}