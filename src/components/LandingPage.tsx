"use client";

import Link from "next/link";
import { TickrLogo } from "@/components/TickrLogo";

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 40px",
      height: 60,
      background: "rgba(21,24,26,0.85)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--line)",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <TickrLogo size={28} />
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.03em" }}>
          Tickir AI
        </span>
      </div>

      {/* CTA buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link
          href="/login"
          style={{
            padding: "7px 16px",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--line-2)",
            background: "transparent",
            color: "var(--ink-3)",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          style={{
            padding: "7px 16px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      padding: "100px 24px 80px",
    }}>
      <h1 style={{
        margin: "0 0 20px",
        fontSize: "clamp(36px, 5vw, 56px)",
        fontWeight: 800,
        color: "var(--ink)",
        letterSpacing: "-0.03em",
        lineHeight: 1.08,
        maxWidth: 680,
      }}>
        Commercial lending,{" "}
        <em style={{ fontStyle: "italic", fontWeight: 800, color: "var(--accent)" }}>reimagined.</em>
      </h1>

      <p style={{
        margin: "0 0 40px",
        fontSize: 18,
        color: "var(--ink-3)",
        lineHeight: 1.6,
        maxWidth: 560,
      }}>
        AI that reads financials, validates documents, and{" "}
        <em style={{ fontStyle: "italic", color: "var(--ink-2)", fontWeight: 400 }}>surfaces what matters.</em>
        {" "}Built for regional banks.
      </p>

      {/* CTAs */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/signup"
          style={{
            padding: "13px 28px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontSize: 15,
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          Start free
        </Link>
        <a
          href="#how-it-works"
          style={{
            padding: "13px 28px",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--line-2)",
            background: "transparent",
            color: "var(--ink-3)",
            fontSize: 15,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          See how it works
        </a>
      </div>

      {/* Social proof pills */}
      <div style={{
        marginTop: 40,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        <span style={{ fontSize: 12, color: "var(--ink-4)", marginRight: 4 }}>Trusted by regional banks</span>
        {["First National Bank", "Midwest Community Bank", "Heritage Savings"].map((name) => (
          <span
            key={name}
            style={{
              padding: "4px 12px",
              borderRadius: 99,
              border: "1px solid var(--line-2)",
              background: "var(--panel)",
              fontSize: 11.5,
              color: "var(--ink-3)",
              fontWeight: 500,
            }}
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar() {
  const stats = [
    { value: "10–20 days", label: "Average deal cycle reduction" },
    { value: ">75%", label: "Cells auto-filled green" },
    { value: "4–8 hrs", label: "Saved per spread" },
  ];

  return (
    <section style={{
      margin: "0 40px",
      borderRadius: "var(--r-xl)",
      border: "1px solid var(--line-2)",
      background: "var(--panel)",
      display: "flex",
      overflow: "hidden",
    }}>
      {stats.map((stat, i) => (
        <div
          key={stat.value}
          style={{
            flex: 1,
            padding: "32px 36px",
            borderLeft: i > 0 ? "1px solid var(--line)" : "none",
            textAlign: "center",
          }}
        >
          <div style={{
            fontSize: 36,
            fontWeight: 800,
            color: "var(--accent)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            marginBottom: 8,
          }}>
            {stat.value}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-4)", lineHeight: 1.4 }}>
            {stat.label}
          </div>
        </div>
      ))}
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const cards = [
    {
      icon: (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--s-doc)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
      topColor: "var(--s-doc)",
      title: "Smart Document Collection",
      body: "Borrowers upload via a secure link. AI validates every document automatically.",
    },
    {
      icon: (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--s-spr)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      topColor: "var(--s-spr)",
      title: "AI Financial Spreading",
      body: "Claude reads your financials and fills your spreading template with confidence scores.",
    },
    {
      icon: (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--s-clo)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      topColor: "var(--s-clo)",
      title: "Deal Pipeline",
      body: "Track every deal from docs to close. Idle alerts, stage advancement, full audit trail.",
    },
  ];

  return (
    <section id="how-it-works" style={{ padding: "100px 40px" }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: "var(--ink-4)",
        textTransform: "uppercase",
        textAlign: "center",
        marginBottom: 48,
      }}>
        How it works
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {cards.map((card) => (
          <div
            key={card.title}
            style={{
              borderRadius: "var(--r-xl)",
              border: "1px solid var(--line)",
              background: "var(--panel)",
              overflow: "hidden",
            }}
          >
            {/* Colored top border */}
            <div style={{ height: 3, background: card.topColor }} />
            <div style={{ padding: "28px 28px 32px" }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "var(--r-md)",
                background: "var(--panel-2)",
                border: "1px solid var(--line-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}>
                {card.icon}
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>
                {card.title}
              </h3>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.6 }}>
                {card.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Trust Layer ──────────────────────────────────────────────────────────────

function TrustLayer() {
  return (
    <section style={{ padding: "0 40px 100px" }}>
      <div style={{
        borderRadius: "var(--r-xl)",
        border: "1px solid var(--line-2)",
        borderLeft: "4px solid var(--accent)",
        background: "var(--panel)",
        padding: "44px 48px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 48,
      }}>
        <div style={{ maxWidth: 560 }}>
          <h2 style={{
            margin: "0 0 16px",
            fontSize: 24,
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
          }}>
            Every AI action is transparent, attributable, and{" "}
          <em style={{ fontStyle: "italic", color: "var(--accent)" }}>reversible.</em>
          </h2>
          <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink-3)", lineHeight: 1.7 }}>
            Green, yellow, and red confidence tiers on every cell. Source citations showing exactly
            which document and line item each value came from. Human approval before any deal advances.
          </p>
        </div>

        {/* Mock confidence pill */}
        <div style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          padding: "24px 28px",
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--line-2)",
          background: "var(--panel-2)",
        }}>
          <div style={{ fontSize: 11, color: "var(--ink-4)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Confidence
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 99,
            background: "rgba(63,207,142,0.16)",
            border: "1px solid var(--accent-deep)",
          }}>
            <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>GREEN</span>
            <span style={{ fontSize: 13, color: "var(--accent)" }}>✓</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.02em" }}>94%</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-4)", textAlign: "center", lineHeight: 1.4 }}>
            Net Income 2023<br />
            <span style={{ color: "var(--ink-3)" }}>Form 1120, line 28</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA Footer ───────────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section style={{
      padding: "80px 40px 100px",
      textAlign: "center",
      borderTop: "1px solid var(--line)",
    }}>
      <h2 style={{
        margin: "0 0 16px",
        fontSize: 36,
        fontWeight: 800,
        color: "var(--ink)",
        letterSpacing: "-0.03em",
      }}>
        Ready to cut your deal cycle{" "}
        <em style={{ fontStyle: "italic", color: "var(--accent)" }}>in half?</em>
      </h2>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 32 }}>
        <Link
          href="/signup"
          style={{
            padding: "14px 32px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontSize: 15,
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          Get started free
        </Link>
        <Link
          href="/login"
          style={{
            fontSize: 14,
            color: "var(--ink-4)",
            textDecoration: "none",
          }}
        >
          or sign in →
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--line)",
      padding: "24px 40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
    }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-4)" }}>
        © 2026 Tickir AI · Built for regional banks
      </span>
      <div style={{ display: "flex", gap: 20 }}>
        {["Privacy", "Terms"].map((label) => (
          <a
            key={label}
            href="#"
            style={{ fontSize: 12.5, color: "var(--ink-4)", textDecoration: "none" }}
          >
            {label}
          </a>
        ))}
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-deep)", color: "var(--ink)" }}>
      <Nav />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <TrustLayer />
      <CtaSection />
      <Footer />
    </div>
  );
}
