import { ShieldAlert, CheckCircle2, XCircle, Users, Lock } from "lucide-react";

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

type MemoSection = { content: string; aiGenerated: boolean };

type DecisionType = "APPROVE" | "DECLINE" | "REFER_TO_COMMITTEE";

type SpreadCellSummary = {
  cellRef: string;
  label: string | null;
  value: string | null;
  confidenceTier: "GREEN" | "YELLOW" | "RED";
  flagReason: string | null;
};

type AdvisoryData = {
  aiRecommendation: DecisionType | null;
  aiConfidence: string | number | null;
  aiRiskRating: string | null;
  aiRationale: string | null;
  decision: DecisionType | null;
  decisionNotes: string | null;
  decidedAt: string | Date | null;
} | null;

type Props = {
  cells: SpreadCellSummary[];
  advisory: AdvisoryData;
  memoSections: Partial<Record<MemoSectionKey, MemoSection>>;
  memoFinalized: boolean;
};

const TIER_COLORS: Record<string, string> = {
  GREEN: "var(--s-clo)",
  YELLOW: "var(--s-spr)",
  RED: "var(--s-dec)",
};

const RECOMMENDATION_LABELS: Record<DecisionType, string> = {
  APPROVE: "Approve",
  DECLINE: "Decline",
  REFER_TO_COMMITTEE: "Refer to Committee",
};

const RECOMMENDATION_COLORS: Record<DecisionType, string> = {
  APPROVE: "var(--s-clo)",
  DECLINE: "var(--s-dec)",
  REFER_TO_COMMITTEE: "var(--s-spr)",
};

const RISK_COLORS: Record<string, string> = {
  LOW: "var(--s-clo)",
  MODERATE: "var(--s-spr)",
  ELEVATED: "var(--s-dec)",
  HIGH: "var(--s-dec)",
};

function sectionStyle() {
  return {
    padding: "16px 18px",
    borderRadius: "var(--r-lg)",
    background: "var(--panel)",
    border: "1px solid var(--line)",
  } as const;
}

function heading(text: string) {
  return (
    <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{text}</h3>
  );
}

export function ReadyForDecisionSummary({ cells, advisory, memoSections, memoFinalized }: Props) {
  const flagged = cells.filter((c) => c.confidenceTier !== "GREEN");
  const counts = {
    green: cells.filter((c) => c.confidenceTier === "GREEN").length,
    yellow: cells.filter((c) => c.confidenceTier === "YELLOW").length,
    red: cells.filter((c) => c.confidenceTier === "RED").length,
  };

  const decisionType = advisory?.decision ?? null;
  const DecisionIcon = decisionType === "APPROVE" ? CheckCircle2 : decisionType === "DECLINE" ? XCircle : Users;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        padding: "12px 16px",
        borderRadius: "var(--r-md)",
        background: "color-mix(in srgb, var(--accent) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 24%, transparent)",
        fontSize: 13,
        color: "var(--ink-2)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <Lock size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
        Spread locked, AI advisory generated, and credit memo drafted. This view consolidates everything
        for credit committee review.
      </div>

      {/* Spread highlights */}
      <div style={sectionStyle()}>
        {heading("Spread Highlights")}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: flagged.length > 0 ? 14 : 0 }}>
          {[
            { count: counts.green, label: "green", color: TIER_COLORS.GREEN },
            { count: counts.yellow, label: "yellow", color: TIER_COLORS.YELLOW },
            { count: counts.red, label: "red", color: TIER_COLORS.RED },
          ].map(({ count, label, color }) => (
            <span key={label} style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              color,
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 26%, transparent)`,
            }}>
              {count} {label}
            </span>
          ))}
        </div>

        {flagged.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {flagged.map((cell) => (
              <li key={cell.cellRef} style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                padding: "8px 10px",
                borderRadius: "var(--r-sm)",
                background: "var(--panel-2)",
                fontSize: 12,
              }}>
                <span style={{ color: "var(--ink-2)" }}>
                  <span style={{ fontWeight: 600 }}>{cell.label ?? cell.cellRef}</span>
                  {": "}
                  {cell.value ?? "—"}
                  {cell.flagReason && (
                    <span style={{ color: "var(--ink-4)" }}> — {cell.flagReason}</span>
                  )}
                </span>
                <span style={{
                  flexShrink: 0,
                  padding: "2px 8px",
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  color: TIER_COLORS[cell.confidenceTier],
                  background: `color-mix(in srgb, ${TIER_COLORS[cell.confidenceTier]} 14%, transparent)`,
                }}>
                  {cell.confidenceTier}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* AI advisory + banker decision */}
      <div style={sectionStyle()}>
        {heading("AI Lending Advisory")}
        {advisory?.aiRecommendation ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={{
                padding: "5px 12px",
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 700,
                color: RECOMMENDATION_COLORS[advisory.aiRecommendation],
                background: `color-mix(in srgb, ${RECOMMENDATION_COLORS[advisory.aiRecommendation]} 14%, transparent)`,
                border: `1px solid color-mix(in srgb, ${RECOMMENDATION_COLORS[advisory.aiRecommendation]} 26%, transparent)`,
              }}>
                Suggests: {RECOMMENDATION_LABELS[advisory.aiRecommendation]}
              </span>
              {advisory.aiRiskRating && (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  color: RISK_COLORS[advisory.aiRiskRating] ?? "var(--ink-3)",
                  background: `color-mix(in srgb, ${RISK_COLORS[advisory.aiRiskRating] ?? "var(--ink-4)"} 14%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${RISK_COLORS[advisory.aiRiskRating] ?? "var(--ink-4)"} 26%, transparent)`,
                }}>
                  <ShieldAlert size={11} /> {advisory.aiRiskRating} risk
                </span>
              )}
              {advisory.aiConfidence != null && (
                <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
                  {Math.round(Number(advisory.aiConfidence) * 100)}% confidence
                </span>
              )}
            </div>
            {advisory.aiRationale && (
              <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
                {advisory.aiRationale}
              </p>
            )}
          </>
        ) : (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-4)" }}>No AI advisory available.</p>
        )}

        {decisionType ? (
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 12px",
            borderRadius: "var(--r-md)",
            background: "var(--panel-2)",
          }}>
            <DecisionIcon size={14} style={{ color: RECOMMENDATION_COLORS[decisionType], flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                Banker decision: {RECOMMENDATION_LABELS[decisionType]}
                {advisory?.decidedAt ? ` (${new Date(advisory.decidedAt).toLocaleDateString()})` : ""}
              </p>
              {advisory?.decisionNotes && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-3)", whiteSpace: "pre-wrap" }}>
                  {advisory.decisionNotes}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-4)", fontStyle: "italic" }}>
            Banker decision not yet recorded.
          </p>
        )}
      </div>

      {/* Credit memo */}
      <div style={sectionStyle()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          {heading("Credit Memo")}
          <span style={{
            padding: "3px 9px",
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 600,
            color: memoFinalized ? "var(--s-clo)" : "var(--s-spr)",
            background: `color-mix(in srgb, ${memoFinalized ? "var(--s-clo)" : "var(--s-spr)"} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${memoFinalized ? "var(--s-clo)" : "var(--s-spr)"} 26%, transparent)`,
          }}>
            {memoFinalized ? "Finalized" : "Draft"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {MEMO_SECTIONS.map((key) => {
            const section = memoSections[key];
            return (
              <div key={key}>
                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {MEMO_SECTION_LABELS[key]}
                </p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
                  {section?.content ?? "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
