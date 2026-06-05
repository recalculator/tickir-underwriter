import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-deep)" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 16px" }}>
        <h1 style={{ fontSize: 72, fontWeight: 700, color: "var(--line-2)", marginBottom: 16 }}>404</h1>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
          Page not found
        </h2>
        <p style={{ color: "var(--ink-3)", marginBottom: 24, fontSize: 14 }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "8px 16px",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            borderRadius: "var(--r-md)",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
