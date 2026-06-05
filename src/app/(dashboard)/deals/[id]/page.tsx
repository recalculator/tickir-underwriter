import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StagesBadge } from "@/components/dashboard/StagesBadge";
import { LOAN_TYPE_LABELS, DEAL_STAGES, DEAL_STAGE_LABELS } from "@/lib/constants";
import { DealTabs } from "@/components/dashboard/DealTabs";
import { SendPortalLinkButton } from "@/components/dashboard/SendPortalLinkButton";
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

type BlockReason = string | null;

function getBlockReason(
  currentStage: string,
  allRequiredDocsValidated: boolean,
  hasLockedSpread: boolean
): BlockReason {
  if (currentStage === "DOCUMENT_COLLECTION" && !allRequiredDocsValidated) {
    return "All required documents must be validated before advancing to Spreading.";
  }
  if (currentStage === "SPREADING" && !hasLockedSpread) {
    return "The spread must be locked before advancing to Credit Review.";
  }
  return null;
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
          spreadCells: { select: { confidenceTier: true } },
        },
      },
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

  const allRequiredDocsValidated =
    deal.documentChecklist.filter((d) => d.required).length > 0 &&
    deal.documentChecklist.filter((d) => d.required).every((d) => d.validated);

  const hasLockedSpread = Boolean(spread?.lockedAt);

  const TERMINAL_STAGES = new Set(["CLOSED", "DECLINED"]);
  const isTerminal = TERMINAL_STAGES.has(deal.stage);

  const stageIdx = DEAL_STAGES.indexOf(deal.stage as (typeof DEAL_STAGES)[number]);
  const nextStage = !isTerminal && stageIdx !== -1 ? (DEAL_STAGES[stageIdx + 1] ?? null) : null;

  const blockReason = nextStage
    ? getBlockReason(deal.stage, allRequiredDocsValidated, hasLockedSpread)
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{deal.borrowerName}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{deal.internalName}</p>
            <div className="mt-2 flex items-center gap-3">
              <StagesBadge stage={deal.stage as DealStageType} />
              <span className="text-xs text-gray-400">
                {daysInStage} day{daysInStage !== 1 ? "s" : ""} in stage
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <SendPortalLinkButton dealId={id} />
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
          <div className="mt-4 rounded-md bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
            <span className="font-semibold">Blocked: </span>
            {blockReason}
          </div>
        )}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Deal Details
        </h2>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Loan Type</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{loanLabel}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Loan Amount</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{formatCurrency(deal.loanAmount)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Banker</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{deal.banker.name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Borrower Email</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{deal.borrowerEmail}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Borrower Phone</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{deal.borrowerPhone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{formatDate(deal.createdAt)}</dd>
          </div>
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
        className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-400 cursor-not-allowed"
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
        const session = await getSession(opts);
        if (!session?.user) return;
        const deal = await db.deal.findFirst({ where: { id: dealId, bankId: session.user.bankId } });
        if (!deal) { serverRedirect(`/deals/${dealId}`); return; }
        const idx = stages.indexOf(deal.stage as (typeof stages)[number]);
        const next = idx !== -1 ? stages[idx + 1] : null;
        if (!next) { serverRedirect(`/deals/${dealId}`); return; }
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
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Advance to {nextLabel}
      </button>
    </form>
  );
}
