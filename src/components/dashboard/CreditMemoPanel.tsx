"use client";

import { useState } from "react";
import { Sparkles, Pencil, RotateCcw, CheckCircle, Lock } from "lucide-react";

const MEMO_SECTIONS = [
  "loanSummary",
  "borrowerOverview",
  "financialAnalysis",
  "riskFactors",
  "strengths",
  "recommendation",
] as const;

type MemoSectionKey = (typeof MEMO_SECTIONS)[number];

const MEMO_SECTION_LABELS: Record<MemoSectionKey, string> = {
  loanSummary: "Loan Summary",
  borrowerOverview: "Borrower Overview",
  financialAnalysis: "Financial Analysis",
  riskFactors: "Risk Factors",
  strengths: "Strengths",
  recommendation: "Recommendation",
};

type MemoSection = {
  content: string;
  aiGenerated: boolean;
  generatedAt?: string;
  editedByUserId?: string;
  editedAt?: string;
};

type CreditMemo = {
  id: string;
  status: "DRAFT" | "GENERATING" | "FINALIZED";
  sectionsJson: Partial<Record<MemoSectionKey, MemoSection>>;
};

type Props = {
  dealId: string;
  initialMemo: CreditMemo | null;
  canFinalize: boolean;
  canGenerate: boolean;
  blockedReason?: string;
};

export function CreditMemoPanel({ dealId, initialMemo, canFinalize, canGenerate, blockedReason }: Props) {
  const [memo, setMemo] = useState<CreditMemo | null>(initialMemo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<MemoSectionKey | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [busySection, setBusySection] = useState<MemoSectionKey | null>(null);

  async function refreshMemo() {
    const res = await fetch(`/api/deals/${dealId}/credit-memo`);
    const data = await res.json();
    if (data.success) setMemo(data.data);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/credit-memo`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await refreshMemo();
      } else {
        setError(data.error ?? "Failed to generate credit memo");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(section: MemoSectionKey, current: string) {
    setEditingSection(section);
    setDraftContent(current);
  }

  async function saveEdit(section: MemoSectionKey) {
    setBusySection(section);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/credit-memo/sections/${section}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draftContent }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingSection(null);
        await refreshMemo();
      } else {
        setError(data.error ?? "Failed to save edit");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusySection(null);
    }
  }

  async function regenerate(section: MemoSectionKey, force = false) {
    setBusySection(section);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/credit-memo/sections/${section}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshMemo();
      } else if (res.status === 409 && !force) {
        if (confirm(`${data.error}\n\nOverwrite with a fresh AI draft?`)) {
          await regenerate(section, true);
          return;
        }
      } else {
        setError(data.error ?? "Failed to regenerate section");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusySection(null);
    }
  }

  async function handleFinalize() {
    if (!confirm("Finalize this credit memo? It can no longer be edited after finalization.")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/credit-memo/finalize`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await refreshMemo();
      } else {
        setError(data.error ?? "Failed to finalize memo");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!memo) {
    return (
      <div style={{ padding: 48, textAlign: "center", borderRadius: "var(--r-lg)", border: "1px dashed var(--line-2)" }}>
        <Sparkles size={20} style={{ color: "var(--accent)", marginBottom: 10 }} />
        <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "var(--ink-3)" }}>
          No credit memo yet
        </p>
        {canGenerate ? (
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: "8px 18px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Drafting…" : "Draft Credit Memo with AI"}
          </button>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-4)" }}>
            {blockedReason ?? "A locked spread is required before drafting a credit memo."}
          </p>
        )}
        {error && <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--s-dec)" }}>{error}</p>}
      </div>
    );
  }

  const sections = memo.sectionsJson ?? {};
  const isFinalized = memo.status === "FINALIZED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 99,
          fontSize: 12,
          fontWeight: 600,
          color: isFinalized ? "var(--s-clo)" : "var(--s-spr)",
          background: `color-mix(in srgb, ${isFinalized ? "var(--s-clo)" : "var(--s-spr)"} 14%, transparent)`,
          border: `1px solid color-mix(in srgb, ${isFinalized ? "var(--s-clo)" : "var(--s-spr)"} 26%, transparent)`,
        }}>
          {isFinalized ? <Lock size={11} /> : <Pencil size={11} />}
          {isFinalized ? "Finalized" : "Draft"}
        </span>

        {!isFinalized && canFinalize && (
          <button
            onClick={handleFinalize}
            disabled={loading}
            style={{
              padding: "7px 14px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Finalizing…" : "Finalize Memo"}
          </button>
        )}
      </div>

      {error && <p style={{ margin: 0, fontSize: 12, color: "var(--s-dec)" }}>{error}</p>}

      {MEMO_SECTIONS.map((key) => {
        const section = sections[key];
        const isEditing = editingSection === key;
        const isBusy = busySection === key;
        return (
          <div key={key} style={{
            padding: "16px 18px",
            borderRadius: "var(--r-lg)",
            background: "var(--panel)",
            border: "1px solid var(--line)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                {MEMO_SECTION_LABELS[key]}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {section && (
                  <span style={{ fontSize: 11, color: "var(--ink-4)" }}>
                    {section.aiGenerated ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Sparkles size={11} style={{ color: "var(--accent)" }} /> AI-generated
                      </span>
                    ) : (
                      "Edited by banker"
                    )}
                  </span>
                )}
                {!isFinalized && !isEditing && (
                  <>
                    <button
                      onClick={() => section && startEdit(key, section.content)}
                      disabled={isBusy}
                      title="Edit"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, display: "flex" }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => regenerate(key)}
                      disabled={isBusy}
                      title="Regenerate with AI"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, display: "flex" }}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div>
                <textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  rows={6}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "var(--r-md)",
                    border: "1px solid var(--line-2)",
                    background: "var(--panel-2)",
                    color: "var(--ink)",
                    fontSize: 13,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setEditingSection(null)}
                    style={{ padding: "6px 14px", borderRadius: "var(--r-md)", background: "transparent", border: "1px solid var(--line-2)", color: "var(--ink-3)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveEdit(key)}
                    disabled={isBusy}
                    style={{ padding: "6px 14px", borderRadius: "var(--r-md)", background: "var(--accent)", color: "var(--accent-ink)", border: "none", fontSize: 12, fontWeight: 700, cursor: isBusy ? "not-allowed" : "pointer" }}
                  >
                    {isBusy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
                {section?.content ?? "—"}
              </p>
            )}
          </div>
        );
      })}

      {isFinalized && (
        <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-4)" }}>
          <CheckCircle size={13} style={{ color: "var(--s-clo)" }} />
          This memo has been finalized and can no longer be edited.
        </p>
      )}
    </div>
  );
}
