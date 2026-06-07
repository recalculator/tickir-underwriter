"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Plus, Search } from "lucide-react";

type NotificationItem = {
  id: string;
  template: string;
  read: boolean;
  createdAt: string;
  dealId: string | null;
  deal: { internalName: string; borrowerName: string } | null;
};

function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.data ?? []);
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    setOpen((prev) => !prev);
    if (!open) {
      try {
        await fetch("/api/notifications?markAllRead=true");
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        // silently fail
      }
    }
  }

  async function handleNotificationClick(n: NotificationItem) {
    setOpen(false);
    if (!n.read) {
      try {
        await fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" });
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
        );
      } catch {
        // silently fail
      }
    }
    if (n.dealId) {
      router.push(`/deals/${n.dealId}`);
    }
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={handleOpen}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: "var(--r-md)",
          border: "1px solid var(--line-2)",
          background: "var(--panel-2)",
          color: "var(--ink-3)",
          cursor: "pointer",
        }}
      >
        <Bell size={15} />
        {unread > 0 && (
          <span style={{
            position: "absolute",
            top: 5,
            right: 5,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--accent-bright)",
            boxShadow: "0 0 0 2px var(--bg-deep)",
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          right: 0,
          top: "calc(100% + 8px)",
          zIndex: 50,
          width: 320,
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--line-2)",
          background: "var(--panel)",
          boxShadow: "var(--shadow)",
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Notifications</p>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--ink-4)" }}>No notifications</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 320, overflowY: "auto" }}>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    cursor: "pointer",
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--line)",
                    fontSize: 13,
                    color: n.read ? "var(--ink-4)" : "var(--ink)",
                    fontWeight: n.read ? 400 : 500,
                  }}
                >
                  <p style={{ margin: 0 }}>{n.template}</p>
                  {n.deal && (
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ink-4)" }}>{n.deal.borrowerName}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 60,
      padding: "0 24px",
      background: "var(--bg-deep)",
      borderBottom: "1px solid var(--line)",
      position: "sticky",
      top: 0,
      zIndex: 20,
      flexShrink: 0,
    }}>
      <div>
        {title && (
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {title}
          </h1>
        )}
        {subtitle && (
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-4)" }}>{subtitle}</p>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={13} style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink-4)",
          }} />
          <input
            type="text"
            placeholder="Search deals…"
            style={{
              padding: "7px 12px 7px 30px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line-2)",
              background: "var(--panel-2)",
              color: "var(--ink)",
              fontSize: 13,
              outline: "none",
              width: 200,
            }}
          />
        </div>

        {session?.user && <NotificationBell />}

        {session?.user ? (
          <Link
            href="/deals/new"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: "var(--r-md)",
              background: "var(--accent-bright)",
              color: "var(--accent-ink)",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <Plus size={14} />
            New Deal
          </Link>
        ) : (
          <Link href="/login" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
