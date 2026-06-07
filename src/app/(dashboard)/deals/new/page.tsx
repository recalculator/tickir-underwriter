"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LOAN_TYPES, LOAN_TYPE_LABELS } from "@/lib/constants";

const LOAN_TYPE_DESCRIPTIONS: Record<string, string> = {
  OWNER_OCCUPIED_CRE: "Commercial real estate where the borrower occupies >51% of the property.",
  BUSINESS_ACQUISITION: "Financing for purchasing an existing business.",
  EQUIPMENT: "Financing for machinery, vehicles, or equipment purchases.",
  CI_LINE_OF_CREDIT: "Revolving credit facility for working capital needs.",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "var(--r-md)",
  border: "1px solid var(--line-2)",
  background: "var(--panel-2)",
  color: "var(--ink)",
  padding: "8px 12px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 500,
  color: "var(--ink-2)",
};

export default function NewDealPage() {
  const router = useRouter();
  const [loadingStep, setLoadingStep] = useState<"deal" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailResult, setEmailResult] = useState<"sent" | "failed" | null>(null);

  const [form, setForm] = useState({
    borrowerName: "",
    borrowerEmail: "",
    borrowerPhone: "",
    loanType: LOAN_TYPES[0] as string,
    loanAmount: "",
    internalName: "",
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEmailResult(null);
    setLoadingStep("deal");

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          loanAmount: Number(form.loanAmount),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to create deal");
        setLoadingStep(null);
        return;
      }

      const dealId: string = json.data.id;

      setLoadingStep("email");

      try {
        const portalRes = await fetch(`/api/deals/${dealId}/portal-link`, { method: "POST" });
        const portalJson = await portalRes.json();
        setEmailResult(portalJson.success ? "sent" : "failed");
      } catch {
        setEmailResult("failed");
      }

      setLoadingStep(null);
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch {
      setError("Network error. Please try again.");
      setLoadingStep(null);
    }
  }

  const loading = loadingStep !== null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", margin: 0 }}>New Deal</h1>
        <p style={{ marginTop: 4, fontSize: 13, color: "var(--ink-3)" }}>Start a new commercial lending deal.</p>
      </div>

      {error && (
        <div style={{
          marginBottom: 16,
          borderRadius: "var(--r-md)",
          padding: "10px 14px",
          fontSize: 13,
          color: "var(--s-dec)",
          background: "color-mix(in srgb, var(--s-dec) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--s-dec) 30%, transparent)",
        }}>
          {error}
        </div>
      )}

      {emailResult === "sent" && (
        <div style={{
          marginBottom: 16,
          borderRadius: "var(--r-md)",
          padding: "10px 14px",
          fontSize: 13,
          color: "var(--accent)",
          background: "var(--accent-glow)",
          border: "1px solid var(--accent-deep)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Deal created! Portal link emailed to <strong>{form.borrowerEmail}</strong>. Redirecting to pipeline…
        </div>
      )}

      {emailResult === "failed" && (
        <div style={{
          marginBottom: 16,
          borderRadius: "var(--r-md)",
          padding: "10px 14px",
          fontSize: 13,
          color: "var(--s-spr)",
          background: "color-mix(in oklch, var(--s-spr) 10%, transparent)",
          border: "1px solid color-mix(in oklch, var(--s-spr) 28%, transparent)",
        }}>
          Deal created, but the portal email failed to send. You can send it manually from the deal page. Redirecting…
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div style={{
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--line)",
            background: "var(--panel)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-4)", margin: 0 }}>
              Borrower Info
            </h2>

            <div>
              <label style={labelStyle}>Borrower Name</label>
              <input
                required
                type="text"
                value={form.borrowerName}
                onChange={(e) => updateField("borrowerName", e.target.value)}
                style={inputStyle}
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label style={labelStyle}>Borrower Email</label>
              <input
                required
                type="email"
                value={form.borrowerEmail}
                onChange={(e) => updateField("borrowerEmail", e.target.value)}
                style={inputStyle}
                placeholder="owner@acme.com"
              />
            </div>

            <div>
              <label style={labelStyle}>Borrower Phone</label>
              <input
                type="tel"
                value={form.borrowerPhone}
                onChange={(e) => updateField("borrowerPhone", e.target.value)}
                style={inputStyle}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>

          <div style={{
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--line)",
            background: "var(--panel)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-4)", margin: 0 }}>
              Deal Info
            </h2>

            <div>
              <label style={labelStyle}>Loan Type</label>
              <select
                required
                value={form.loanType}
                onChange={(e) => updateField("loanType", e.target.value)}
                style={{ ...inputStyle, background: "var(--panel-2)" }}
              >
                {LOAN_TYPES.map((type) => (
                  <option key={type} value={type} style={{ background: "var(--bg-deep)" }}>
                    {LOAN_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              {form.loanType && (
                <p style={{ marginTop: 6, fontSize: 12, color: "var(--ink-4)" }}>
                  {LOAN_TYPE_DESCRIPTIONS[form.loanType] ?? ""}
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle}>Loan Amount</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 12,
                  display: "flex",
                  alignItems: "center",
                  fontSize: 13,
                  color: "var(--ink-4)",
                  pointerEvents: "none",
                }}>
                  $
                </span>
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={form.loanAmount}
                  onChange={(e) => updateField("loanAmount", e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 24 }}
                  placeholder="1,000,000"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Internal Deal Name</label>
              <input
                required
                type="text"
                value={form.internalName}
                onChange={(e) => updateField("internalName", e.target.value)}
                style={inputStyle}
                placeholder="Acme-CRE-2024-001"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            href="/dashboard"
            style={{
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line-2)",
              background: "var(--panel-2)",
              color: "var(--ink-2)",
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            style={{
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loadingStep === "deal" ? "Creating deal…" : loadingStep === "email" ? "Sending email…" : "Create Deal"}
          </button>
        </div>
      </form>
    </div>
  );
}
