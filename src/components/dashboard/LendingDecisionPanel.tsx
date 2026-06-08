"use client";

import { useState } from "react";
import { Sparkles, ShieldAlert, CheckCircle2, XCircle, Users } from "lucide-react";

type DecisionType = "APPROVE" | "DECLINE" | "REFER_TO_COMMITTEE";
type RiskRating = "LOW" | "MODERATE" | "ELEVATED" | "HIGH";

type LendingDecision = {
  id: string;
  aiRecommendation: DecisionType | null;
  aiConfidence: string | number | null;
  aiRiskRating: RiskRating | string | null;
  aiRationale: string | null;
  decision: DecisionType | null;
  decisionNotes: string | null;
  decidedAt: string | Date | null;
};

type Props = {
  dealId: string;
  initialDecision: LendingDecision | null;
  canGenerateAdvisory: boolean;
};

const RECOMMENDATION_LABELS: Record<DecisionType, string> = {
  APPROVE: "Approve",
  DECLINE: "Decline",
  REFER_TO_COMMITTEE: "Refer to Committee",
};

const RISK_COLORS: Record<string, string> = {
  LOW: "var(--s-clo)",
  MODERATE: "var(--s-spr)",
  ELEVATED: "var(--s-dec)",
  HIGH: "var(--s-dec)",
};

const RECOMMENDATION_COLORS: Record<DecisionType, string> = {
  APPROVE: "var(--s-clo)",
  DECLINE: "var(--s-dec)",
  REFER_TO_COMMITTEE: "var(--s-spr)",
};

export function LendingDecisionPanel({ dealId, initialDecision, canGenerateAdvisory }: Props) {
  const [decision, setDecision] = useState<LendingDecision | null>(initialDecision);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<DecisionType | null>(decision?.decision ?? null);
  const [notes, setNotes] = useState(decision?.decisionNotes ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/deals/${dealId}/lending-decision`);
    const data = await res.json();
    if (data.success) setDecision(data.data);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/lending-decision`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await refresh();
      } else {
        setError(data.error ?? "Failed to generate advisory");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitDecision() {
    if (!choice) {
      setError("Select a decision before submitting.");
      return;
    }
    if (!notes.trim()) {
      setError("Please provide notes explaining the decision.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/lending-decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: choice, notes }),
      });
      const data = await res.json();
      if (data.success) {
        await refresh();
      } else {
        setError(data.error ?? "Failed to record decision");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const confidencePct =
    decision?.aiConfidence != null ? Math.round(Number(decision.aiConfidence) * 100) : null;

  const isRecorded = Boolean(decision?.decision && decision?.decidedAt);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* AI Advisory section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Sparkles size={14} style={{ color: "var(--accent)" }} />
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>AI Advisory</h3>
          <span style={{ fontSize: 11, color: "var(--ink-4)" }}>(assists the banker — does not decide)</span>
        </div>

        {!decision?.aiRecommendation ? (
          <div style={{ padding: 32, textAlign: "center", borderRadius: "var(--r-lg)", border: "1px dashed var(--line-2)" }}>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ink-3)" }}>No AI advisory generated yet</p>
            {canGenerateAdvisory ? (
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
                {loading ? "Analyzing…" : "Generate AI Advisory"}
              </button>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-4)" }}>
                A locked spread is required before generating an advisory.
              </p>
            )}
          </div>
        ) : (
          <div style={{
            padding: "16px 18px",
            borderRadius: "var(--r-lg)",
            background: "var(--panel)",
            border: "1px solid var(--line)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <span style={{
                padding: "5px 12px",
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 700,
                color: RECOMMENDATION_COLORS[decision.aiRecommendation],
                background: `color-mix(in srgb, ${RECOMMENDATION_COLORS[decision.aiRecommendation]} 14%, transparent)`,
                border: `1px solid color-mix(in srgb, ${RECOMMENDATION_COLORS[decision.aiRecommendation]} 26%, transparent)`,
              }}>
                Suggests: {RECOMMENDATION_LABELS[decision.aiRecommendation]}
              </span>
              {decision.aiRiskRating && (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  color: RISK_COLORS[decision.aiRiskRating] ?? "var(--ink-3)",
                  background: `color-mix(in srgb, ${RISK_COLORS[decision.aiRiskRating] ?? "var(--ink-4)"} 14%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${RISK_COLORS[decision.aiRiskRating] ?? "var(--ink-4)"} 26%, transparent)`,
                }}>
                  <ShieldAlert size={11} /> {decision.aiRiskRating} risk
                </span>
              )}
              {confidencePct !== null && (
                <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
                  {confidencePct}% confidence
                </span>
              )}
            </div>
            {decision.aiRationale && (
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
                {decision.aiRationale}
              </p>
            )}
            <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--ink-4)", fontStyle: "italic" }}>
              This is advisory input only. The final lending decision is made by the banker below.
            </p>
          </div>
        )}
      </div>

      <div style={{ height: 1, background: "var(--line)" }} />

      {/* Banker decision section */}
      <div>
        <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Banker Decision</h3>

        {error && <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--s-dec)" }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {(["APPROVE", "DECLINE", "REFER_TO_COMMITTEE"] as DecisionType[]).map((type) => {
            const active = choice === type;
            const color = RECOMMENDATION_COLORS[type];
            const Icon = type === "APPROVE" ? CheckCircle2 : type === "DECLINE" ? XCircle : Users;
            return (
              <button
                key={type}
                onClick={() => setChoice(type)}
                disabled={isRecorded}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: "var(--r-md)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isRecorded ? "default" : "pointer",
                  color: active ? "var(--accent-ink)" : color,
                  background: active ? color : `color-mix(in srgb, ${color} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                  opacity: isRecorded && !active ? 0.4 : 1,
                }}
              >
                <Icon size={14} /> {RECOMMENDATION_LABELS[type]}
              </button>
            );
          })}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isRecorded}
          placeholder="Explain the reasoning behind this decision…"
          rows={5}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--line-2)",
            background: isRecorded ? "var(--panel)" : "var(--panel-2)",
            color: "var(--ink)",
            fontSize: 13,
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />

        {!isRecorded ? (
          <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSubmitDecision}
              disabled={submitting}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--r-md)",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Recording…" : "Record Decision"}
            </button>
          </div>
        ) : (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-4)", display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={13} style={{ color: "var(--s-clo)" }} />
            Decision recorded
            {decision?.decidedAt ? ` on ${new Date(decision.decidedAt).toLocaleDateString()}` : ""}.
          </p>
        )}
      </div>
    </div>
  );
}
