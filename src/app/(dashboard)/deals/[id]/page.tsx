import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StagesBadge } from "@/components/dashboard/StagesBadge";
import { LOAN_TYPE_LABELS, DEAL_STAGES, DEAL_STAGE_LABELS } from "@/lib/constants";
import { DealTabs } from "@/components/dashboard/DealTabs";
import { PipelineStepper, type PipelineStep } from "@/components/dashboard/PipelineStepper";
import { getStageBlockReason } from "@/lib/stage-gating";
import type { DealStageType } from "@/types";

type PageProps = { params: Promise<{ id: string }> };

function formatCurrency(amount: unknown): string {
  const num = Number(amount);
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getDaysInStage(updatedAt: Date): number {
  return Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export default async function DealDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const deal = await prisma.deal.findFirst({
    where: { id, bankId: session.user.bankId },
    include: {
      banker: { select: { id: true, name: true, email: true } },
      documentChecklist: { orderBy: { docType: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { name: true } } },
      },
      spreads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          spreadCells: true,
          template: { select: { cellsJson: true } },
        },
      },
      creditMemo: true,
      lendingDecision: true,
    },
  });

  if (!deal) notFound();

  const loanLabel =
    LOAN_TYPE_LABELS[deal.loanType as keyof typeof LOAN_TYPE_LABELS] ?? deal.loanType;
  const daysInStage = getDaysInStage(deal.updatedAt);
  const hasSpread = deal.spreads.length > 0;

  const spread = deal.spreads[0] ?? null;
  const spreadSummary = spread
    ? {
        green: spread.spreadCells.filter((c) => c.confidenceTier === "GREEN").length,
        yellow: spread.spreadCells.filter((c) => c.confidenceTier === "YELLOW").length,
        red: spread.spreadCells.filter((c) => c.confidenceTier === "RED").length,
        locked: Boolean(spread.lockedAt),
      }
    : null;

  const requiredDocs = deal.documentChecklist.filter((d) => d.required);
  const allRequiredDocsValidated = requiredDocs.length > 0 && requiredDocs.every((d) => d.validated);

  const hasLockedSpread = Boolean(spread?.lockedAt);
  const hasAdvisory = Boolean(deal.lendingDecision?.aiGeneratedAt);
  const hasMemo = Boolean(deal.creditMemo);
  const memoFinalized = deal.creditMemo?.status === "FINALIZED";

  const spreadCellsJson = (spread?.template?.cellsJson ?? {}) as Record<string, { label?: string }>;
  const spreadCells = (spread?.spreadCells ?? []).map((cell) => ({
    cellRef: cell.cellRef,
    label: spreadCellsJson[cell.cellRef]?.label ?? null,
    value: cell.correctedValue ?? cell.value,
    confidenceTier: cell.confidenceTier as "GREEN" | "YELLOW" | "RED",
    flagReason: cell.flagReason,
  }));

  function stepStatus(complete: boolean, ready: boolean): PipelineStep["status"] {
    if (complete) return "complete";
    return ready ? "current" : "pending";
  }

  const pipelineSteps: PipelineStep[] = [
    { key: "documents", label: "Documents", status: stepStatus(allRequiredDocsValidated, true) },
    { key: "spread", label: "Spread", status: stepStatus(hasLockedSpread, allRequiredDocsValidated) },
    { key: "decision", label: "Decision", status: stepStatus(hasAdvisory, hasLockedSpread) },
    { key: "memo", label: "Memo", status: stepStatus(memoFinalized, hasAdvisory) },
  ];

  const TERMINAL_STAGES = new Set(["CLOSED", "DECLINED"]);
  const isTerminal = TERMINAL_STAGES.has(deal.stage);

  const stageIdx = DEAL_STAGES.indexOf(deal.stage as (typeof DEAL_STAGES)[number]);
  const nextStage = !isTerminal && stageIdx !== -1 ? (DEAL_STAGES[stageIdx + 1] ?? null) : null;

  const blockReason = nextStage
    ? getStageBlockReason({
        stage: deal.stage as DealStageType,
        allRequiredDocsValidated,
        hasLockedSpread,
        hasAdvisory,
        hasMemo,
        memoFinalized,
      })
    : null;

  return (
    <div style={{ padding: "24px 28px", background: "var(--bg-deep)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        marginBottom: 24,
        padding: "20px 24px",
        borderRadius: "var(--r-lg)",
        background: "var(--panel)",
        border: "1px solid var(--line)",
      }}>
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-4)" }}>
            <a href="/dashboard" style={{ color: "var(--ink-4)", textDecoration: "none" }}>Pipeline</a>
            {" → "}
            <span style={{ color: "var(--ink-3)" }}>{deal.borrowerName}</span>
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>
              {deal.borrowerName}
            </h1>
            <p style={{ margin: "2px 0 8px", fontSize: 13, color: "var(--ink-4)" }}>{deal.internalName}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <StagesBadge stage={deal.stage as DealStageType} />
              <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
                {daysInStage} day{daysInStage !== 1 ? "s" : ""} in stage
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {!isTerminal && nextStage && (
              <AdvanceStageButton
                dealId={id}
                currentStage={deal.stage}
                nextStage={nextStage}
                blockReason={blockReason}
              />
            )}
          </div>
        </div>

        {blockReason && (
          <div style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: "var(--r-md)",
            background: "color-mix(in oklch, var(--s-spr) 12%, transparent)",
            border: "1px solid color-mix(in oklch, var(--s-spr) 26%, transparent)",
            fontSize: 13,
            color: "var(--s-spr)",
          }}>
            <span style={{ fontWeight: 600 }}>Blocked: </span>
            {blockReason}
          </div>
        )}

        {!isTerminal && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <PipelineStepper steps={pipelineSteps} />
          </div>
        )}
      </div>

      {/* Deal Details */}
      <section style={{
        marginBottom: 24,
        padding: "20px 24px",
        borderRadius: "var(--r-lg)",
        background: "var(--panel)",
        border: "1px solid var(--line)",
      }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
          Deal Details
        </h2>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, fontSize: 13 }}>
          {[
            { label: "Loan Type", value: loanLabel },
            { label: "Loan Amount", value: formatCurrency(deal.loanAmount) },
            { label: "Banker", value: deal.banker.name },
            { label: "Borrower Email", value: deal.borrowerEmail },
            { label: "Borrower Phone", value: deal.borrowerPhone ?? "—" },
            { label: "Created", value: formatDate(deal.createdAt) },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt style={{ color: "var(--ink-4)", marginBottom: 2 }}>{label}</dt>
              <dd style={{ margin: 0, fontWeight: 600, color: "var(--ink)" }}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <DealTabs
        deal={{
          id: deal.id,
          internalName: deal.internalName,
          borrowerEmail: deal.borrowerEmail,
          documentChecklist: deal.documentChecklist,
          documents: deal.documents.map((d) => ({
            id: d.id,
            docType: d.docType,
            originalFilename: d.originalFilename,
            status: d.status,
            aiNotes: d.aiNotes,
          })),
          activityLogs: deal.activityLogs.map((log) => ({
            id: log.id,
            actionType: log.actionType,
            createdAt: log.createdAt,
            userName: log.user?.name ?? "System",
          })),
          hasSpread,
          spreadSummary,
          spreadCells,
          stage: deal.stage,
          userRole: session.user.role,
          creditMemo: deal.creditMemo
            ? {
                id: deal.creditMemo.id,
                status: deal.creditMemo.status,
                sectionsJson: deal.creditMemo.sectionsJson as Record<string, unknown>,
              }
            : null,
          lendingDecision: deal.lendingDecision
            ? {
                id: deal.lendingDecision.id,
                aiRecommendation: deal.lendingDecision.aiRecommendation,
                aiConfidence: deal.lendingDecision.aiConfidence?.toString() ?? null,
                aiRiskRating: deal.lendingDecision.aiRiskRating,
                aiRationale: deal.lendingDecision.aiRationale,
                decision: deal.lendingDecision.decision,
                decisionNotes: deal.lendingDecision.decisionNotes,
                decidedAt: deal.lendingDecision.decidedAt,
              }
            : null,
          bankerNotes: deal.bankerNotes,
          bankerNotesUpdatedAt: deal.bankerNotesUpdatedAt,
          hasAdvisory,
          hasMemo,
          memoFinalized,
        }}
      />
    </div>
  );
}

function AdvanceStageButton({
  dealId,
  currentStage,
  nextStage,
  blockReason,
}: {
  dealId: string;
  currentStage: string;
  nextStage: string;
  blockReason: string | null;
}) {
  const labels = DEAL_STAGE_LABELS as Record<string, string>;
  const currentLabel = labels[currentStage] ?? currentStage;
  const nextLabel = labels[nextStage] ?? nextStage;

  if (blockReason) {
    return (
      <button
        disabled
        title={blockReason}
        style={{
          padding: "7px 14px",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--line-2)",
          background: "transparent",
          color: "var(--ink-4)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "not-allowed",
          opacity: 0.5,
        }}
      >
        Advance to {nextLabel}
      </button>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        const { redirect: serverRedirect } = await import("next/navigation");
        const { prisma: db } = await import("@/lib/prisma");
        const { getServerSession: getSession } = await import("next-auth");
        const { authOptions: opts } = await import("@/lib/auth");
        const { DEAL_STAGES: stages } = await import("@/lib/constants");
        const { getStageBlockReason: getBlockReason } = await import("@/lib/stage-gating");
        const session = await getSession(opts);
        if (!session?.user) return;
        const deal = await db.deal.findFirst({
          where: { id: dealId, bankId: session.user.bankId },
          include: {
            documentChecklist: true,
            spreads: { where: { lockedAt: { not: null } }, take: 1 },
            lendingDecision: true,
            creditMemo: true,
          },
        });
        if (!deal) { serverRedirect(`/deals/${dealId}`); return; }
        const idx = stages.indexOf(deal.stage as (typeof stages)[number]);
        const next = idx !== -1 ? stages[idx + 1] : null;
        if (!next) { serverRedirect(`/deals/${dealId}`); return; }
        const requiredDocs = deal.documentChecklist.filter((d) => d.required);
        const blocked = getBlockReason({
          stage: deal.stage as (typeof stages)[number],
          allRequiredDocsValidated: requiredDocs.length > 0 && requiredDocs.every((d) => d.validated),
          hasLockedSpread: deal.spreads.length > 0,
          hasAdvisory: Boolean(deal.lendingDecision?.aiGeneratedAt),
          hasMemo: Boolean(deal.creditMemo),
          memoFinalized: deal.creditMemo?.status === "FINALIZED",
        });
        if (blocked) { serverRedirect(`/deals/${dealId}`); return; }
        await db.$transaction([
          db.deal.update({ where: { id: dealId }, data: { stage: next } }),
          db.activityLog.create({
            data: {
              dealId,
              bankId: deal.bankId,
              userId: session.user.id,
              actionType: "STAGE_ADVANCED",
              metadataJson: { from: deal.stage, to: next },
            },
          }),
        ]);
        serverRedirect(`/deals/${dealId}`);
      }}
    >
      <input type="hidden" name="_confirm" value={`Move from ${currentLabel} to ${nextLabel}`} />
      <button
        type="submit"
        style={{
          padding: "7px 14px",
          borderRadius: "var(--r-md)",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          fontSize: 13,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
        }}
      >
        Advance to {nextLabel}
      </button>
    </form>
  );
}
