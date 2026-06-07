"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Plus,
  BarChart2,
  Link as LinkIcon,
  TableProperties,
  LogOut,
} from "lucide-react";
import { TickrLogo } from "@/components/TickrLogo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  section?: "main" | "admin";
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Pipeline", icon: <LayoutDashboard size={16} />, section: "main" },
  { href: "/deals/new", label: "New Deal", icon: <Plus size={16} />, section: "main" },
  { href: "/spreads", label: "Spreads", icon: <BarChart2 size={16} />, section: "main" },
  { href: "/borrower-links", label: "Borrower Links", icon: <LinkIcon size={16} />, section: "main" },
  { href: "/admin/templates", label: "Templates", icon: <TableProperties size={16} />, section: "admin", adminOnly: true },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  BANKER: "Banker",
  CREDIT_OFFICER: "Credit Officer",
};

function BrandMark() {
  return (
    <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <TickrLogo size={28} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", lineHeight: 1 }}>Tickir AI</div>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "var(--ink-4)", marginTop: 2 }}>LOAN OS</div>
      </div>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "";
  const isAdmin = userRole === "ADMIN";

  const mainItems = NAV_ITEMS.filter((item) => item.section === "main" && (!item.adminOnly || isAdmin));
  const adminItems = NAV_ITEMS.filter((item) => item.section === "admin" && (!item.adminOnly || isAdmin));

  function NavLink({ item }: { item: NavItem }) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <li>
        <Link
          href={item.href}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "7px 12px",
            borderRadius: "var(--r-md)",
            fontSize: 13,
            fontWeight: 500,
            color: isActive ? "var(--ink)" : "var(--ink-4)",
            background: isActive ? "var(--panel-hi)" : "transparent",
            border: isActive ? "1px solid var(--line-2)" : "1px solid transparent",
            position: "relative",
            textDecoration: "none",
            transition: "all 0.15s ease",
          }}
        >
          {isActive && (
            <span style={{
              position: "absolute",
              left: 0,
              top: 6,
              bottom: 6,
              width: 3,
              borderRadius: 2,
              background: "var(--accent)",
            }} />
          )}
          <span style={{ color: isActive ? "var(--accent-bright)" : "var(--ink-4)", display: "flex" }}>
            {item.icon}
          </span>
          {item.label}
        </Link>
      </li>
    );
  }

  const userName = session?.user?.name ?? "";
  const initials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <aside style={{
      display: "flex",
      flexDirection: "column",
      width: 236,
      height: "100vh",
      background: "var(--bg)",
      borderRight: "1px solid var(--line)",
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 18px", borderBottom: "1px solid var(--line)" }}>
        <BrandMark />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {mainItems.map((item) => <NavLink key={item.href + item.label} item={item} />)}
        </ul>

        {adminItems.length > 0 && (
          <>
            <div style={{ margin: "14px 0 8px", padding: "0 4px" }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}>Admin</span>
            </div>
            <div style={{ borderTop: "1px solid var(--line)", marginBottom: 8 }} />
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              {adminItems.map((item) => <NavLink key={item.href + item.label} item={item} />)}
            </ul>
          </>
        )}
      </nav>

      {/* Auto-spread card */}
      <div style={{ margin: "0 10px 10px", padding: "11px 12px", background: "var(--panel)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, whiteSpace: "nowrap" }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--accent-bright)",
            flexShrink: 0,
            animation: "pulseDot 2.4s ease infinite",
          }} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-2)" }}>Auto-spread on</span>
        </div>
        <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-4)", lineHeight: 1.45 }}>
          New financials are spread automatically. You review the flags.
        </p>
      </div>

      {/* User */}
      {session?.user && (
        <div style={{ borderTop: "1px solid var(--line)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--panel-hi)",
            border: "1px solid var(--line-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--ink-2)",
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 550, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {userName}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--ink-4)" }}>
              {ROLE_LABELS[userRole] ?? userRole}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ink-4)",
              padding: 5,
              borderRadius: 7,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink-2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink-4)"; }}
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
