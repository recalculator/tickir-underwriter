"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function BrandMark() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 40 }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: "var(--accent)",
        display: "grid",
        placeItems: "center",
        boxShadow: "0 0 0 1px color-mix(in oklch, var(--accent) 60%, transparent), 0 4px 20px -4px var(--accent-glow)",
        flexShrink: 0,
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 13l5 5L20 5" />
        </svg>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1 }}>LendFlow</div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "var(--ink-4)", marginTop: 5, textTransform: "uppercase" }}>Credit OS</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  function handlePortalSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = token.trim();
    if (trimmed) {
      router.push(`/portal/${trimmed}`);
    }
  }

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-deep)",
      padding: "0 16px",
    }}>
      <BrandMark />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, width: "100%", maxWidth: 560 }}>
        {/* Bank staff card */}
        <div style={{
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--line)",
          background: "var(--panel)",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}>
          <div style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>Bank staff</h2>
            <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "var(--ink-4)", lineHeight: 1.45 }}>
              Manage deals, spreads and borrower docs.
            </p>
          </div>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <Link
              href="/login"
              style={{
                display: "block",
                width: "100%",
                padding: "9px 14px",
                borderRadius: "var(--r-md)",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontSize: 13,
                fontWeight: 700,
                textAlign: "center",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              style={{
                display: "block",
                width: "100%",
                padding: "9px 14px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line-2)",
                background: "transparent",
                color: "var(--ink-3)",
                fontSize: 13,
                fontWeight: 500,
                textAlign: "center",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Create account
            </Link>
          </div>
        </div>

        {/* Borrower card */}
        <div style={{
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--line)",
          background: "var(--panel)",
          padding: 28,
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>Borrower</h2>
            <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "var(--ink-4)", lineHeight: 1.45 }}>
              Enter your upload code from your banker.
            </p>
          </div>
          <form onSubmit={handlePortalSubmit} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your upload code…"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line-2)",
                background: "var(--panel-2)",
                color: "var(--ink)",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              disabled={!token.trim()}
              style={{
                width: "100%",
                padding: "9px 14px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line-2)",
                background: "var(--panel-2)",
                color: token.trim() ? "var(--ink-2)" : "var(--ink-4)",
                fontSize: 13,
                fontWeight: 500,
                cursor: token.trim() ? "pointer" : "not-allowed",
                opacity: token.trim() ? 1 : 0.5,
                boxSizing: "border-box",
              }}
            >
              Go to my portal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
