"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StagesBadge } from "./StagesBadge";
import { LOAN_TYPE_LABELS, DEAL_STAGE_LABELS, DEAL_STAGES } from "@/lib/constants";
import type { DealListItem, DealStageType } from "@/types";

type Props = {
  deals: DealListItem[];
};

function formatCurrency(amount: unknown): string {
  const num = Number(amount);
  if (isNaN(num)) return "$0";
  if (num >= 1_000_000) {
    return "$" + (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1_000) {
    return "$" + (num / 1_000).toFixed(0) + "K";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

function DocProgressBar({ uploaded, required }: { uploaded: number; required: number }) {
  const pct = required === 0 ? 0 : Math.round((uploaded / required) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {uploaded}/{required}
      </span>
      <div style={{ width: 56, height: 4, borderRadius: 2, background: "var(--panel-2)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 2,
          background: pct === 100 ? "var(--accent)" : "var(--ink-4)",
        }} />
      </div>
    </div>
  );
}

function StatsBar({ deals }: { deals: DealListItem[] }) {
  const openDeals = deals.filter((d) => !["CLOSED", "DECLINED"].includes(d.stage));
  const activeVolume = openDeals.reduce((sum, d) => sum + Number(d.loanAmount ?? 0), 0);
  const inCreditReview = deals.filter((d) => d.stage === "CREDIT_REVIEW").length;
  const needsAttention = deals.filter((d) => d.daysInStage > 3 && !["CLOSED", "DECLINED"].includes(d.stage)).length;

  const closedDeals = deals.filter((d) => d.stage === "CLOSED");
  const avgDays = closedDeals.length > 0
    ? Math.round(closedDeals.reduce((sum, d) => sum + d.daysInStage, 0) / closedDeals.length)
    : 0;

  const stats = [
    { label: "Active volume", value: formatCurrency(activeVolume), sub: `${openDeals.length} open deals` },
    { label: "In credit review", value: String(inCreditReview), sub: "awaiting decision" },
    { label: "Needs attention", value: String(needsAttention), sub: "idle >3 days" },
    { label: "Avg. days to close", value: avgDays > 0 ? `${avgDays}d` : "—", sub: "based on closed deals" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          padding: "14px 16px",
          borderRadius: "var(--r-lg)",
          background: "var(--panel)",
          border: "1px solid var(--line)",
        }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            {s.value}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}>{s.label}</p>
          <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--ink-4)" }}>{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

function StageBars({ deals, activeStage, onFilter }: { deals: DealListItem[]; activeStage: string; onFilter: (s: string) => void }) {
  const stageCounts = DEAL_STAGES.map((s) => ({
    stage: s,
    count: deals.filter((d) => d.stage === s).length,
  }));
  const max = Math.max(...stageCounts.map((s) => s.count), 1);

  return (
    <div style={{
      display: "flex",
      gap: 6,
      marginBottom: 16,
      padding: "12px 16px",
      background: "var(--panel)",
      borderRadius: "var(--r-lg)",
      border: "1px solid var(--line)",
    }}>
      {stageCounts.map(({ stage, count }) => (
        <button
          key={stage}
          onClick={() => onFilter(stage === activeStage ? "ALL" : stage)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "6px 4px",
            borderRadius: "var(--r-sm)",
            border: "none",
            background: activeStage === stage ? "var(--panel-hi)" : "transparent",
            cursor: "pointer",
          }}
        >
          <div style={{ width: "100%", height: 32, display: "flex", alignItems: "flex-end" }}>
            <div style={{
              width: "100%",
              height: `${Math.max((count / max) * 100, 8)}%`,
              borderRadius: 2,
              background: activeStage === stage ? "var(--accent)" : "var(--panel-2)",
            }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{count}</span>
          <span style={{ fontSize: 10, color: "var(--ink-4)", textAlign: "center", lineHeight: 1.2 }}>
            {DEAL_STAGE_LABELS[stage]?.split(" ")[0]}
          </span>
        </button>
      ))}
    </div>
  );
}

const COL_STYLE: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 12,
  textAlign: "left",
  whiteSpace: "nowrap",
};

const TH_STYLE: React.CSSProperties = {
  ...COL_STYLE,
  fontWeight: 600,
  color: "var(--ink-4)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  fontSize: 10,
  borderBottom: "1px solid var(--line)",
  background: "var(--panel-2)",
};

export function PipelineList({ deals }: Props) {
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const filtered = deals.filter((d) => {
    const matchesStage = stageFilter === "ALL" || d.stage === stageFilter;
    const matchesSearch =
      search.trim() === "" ||
      d.borrowerName.toLowerCase().includes(search.toLowerCase()) ||
      d.internalName.toLowerCase().includes(search.toLowerCase());
    return matchesStage && matchesSearch;
  });

  if (deals.length === 0) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 64,
        borderRadius: "var(--r-lg)",
        border: "1px dashed var(--line-2)",
        background: "var(--panel)",
      }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink-3)" }}>No deals yet</p>
        <Link
          href="/deals/new"
          style={{
            marginTop: 16,
            padding: "8px 18px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          New Deal
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <StatsBar deals={deals} />
      <StageBars deals={deals} activeStage={stageFilter} onFilter={setStageFilter} />

      {/* Filter pills + search */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setStageFilter("ALL")}
          style={{
            padding: "5px 12px",
            borderRadius: 99,
            fontSize: 12,
            fontWeight: 600,
            border: "1px solid transparent",
            cursor: "pointer",
            background: stageFilter === "ALL" ? "var(--accent)" : "var(--panel)",
            color: stageFilter === "ALL" ? "var(--accent-ink)" : "var(--ink-4)",
            borderColor: stageFilter === "ALL" ? "transparent" : "var(--line-2)",
          }}
        >
          All open
        </button>
        {DEAL_STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(stageFilter === s ? "ALL" : s)}
            style={{
              padding: "5px 12px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid var(--line-2)",
              cursor: "pointer",
              background: stageFilter === s ? "var(--panel-hi)" : "transparent",
              color: stageFilter === s ? "var(--ink)" : "var(--ink-4)",
            }}
          >
            {DEAL_STAGE_LABELS[s]}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <input
          type="text"
          placeholder="Search borrower…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "6px 12px",
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

      {/* Table */}
      <div style={{ width: "100%", overflowX: "auto", borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "transparent" }}>
          <thead>
            <tr>
              {["Borrower", "Type", "Amount", "Stage", "Documents", "Risk", "Idle", ""].map((h) => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((deal) => {
              const loanLabel = LOAN_TYPE_LABELS[deal.loanType as keyof typeof LOAN_TYPE_LABELS] ?? deal.loanType;
              const isIdleRed = deal.daysInStage > 3;
              const initials = deal.borrowerName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

              return (
                <tr
                  key={deal.id}
                  style={{ borderBottom: "1px solid var(--line)", cursor: "pointer" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--panel-2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <td style={COL_STYLE}>
                    <Link href={`/deals/${deal.id}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "var(--panel-hi)",
                        border: "1px solid var(--line-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--ink-3)",
                        flexShrink: 0,
                      }}>
                        {initials}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{deal.borrowerName}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--ink-4)" }}>{deal.internalName}</p>
                      </div>
                    </Link>
                  </td>
                  <td style={{ ...COL_STYLE, color: "var(--ink-3)" }}>{loanLabel}</td>
                  <td style={{ ...COL_STYLE, color: "var(--ink)", fontWeight: 600, fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-geist-mono, ui-monospace)" }}>
                    {formatCurrency(deal.loanAmount)}
                  </td>
                  <td style={COL_STYLE}>
                    <StagesBadge stage={deal.stage as DealStageType} />
                  </td>
                  <td style={COL_STYLE}>
                    <DocProgressBar uploaded={deal.documentsUploaded} required={deal.documentsRequired} />
                  </td>
                  <td style={COL_STYLE}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: isIdleRed ? "var(--s-spr)" : "var(--accent-bright)",
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: isIdleRed ? "var(--s-spr)" : "var(--accent-bright)" }}>
                        {isIdleRed ? "Watch" : "Pass"}
                      </span>
                    </div>
                  </td>
                  <td style={{
                    ...COL_STYLE,
                    color: isIdleRed ? "var(--s-dec)" : "var(--ink-3)",
                    fontWeight: isIdleRed ? 600 : 400,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {deal.daysInStage}d
                  </td>
                  <td style={{ ...COL_STYLE, color: "var(--ink-4)" }}>
                    <Link href={`/deals/${deal.id}`} style={{ color: "var(--ink-4)", display: "flex", alignItems: "center" }}>
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
