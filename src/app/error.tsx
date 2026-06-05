"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-deep)" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 16px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
          Something went wrong
        </h1>
        <p style={{ color: "var(--ink-3)", marginBottom: 24, fontSize: 14 }}>
          An unexpected error occurred. Please try again or return to the dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            style={{
              padding: "8px 16px",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              borderRadius: "var(--r-md)",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            style={{
              padding: "8px 16px",
              border: "1px solid var(--line-2)",
              background: "var(--panel-2)",
              color: "var(--ink-2)",
              borderRadius: "var(--r-md)",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
