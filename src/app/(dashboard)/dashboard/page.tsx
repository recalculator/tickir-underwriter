import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PipelineList } from "@/components/dashboard/PipelineList";
import { DEAL_STAGE_LABELS } from "@/lib/constants";
import type { DealListItem } from "@/types";

function getDaysInStage(updatedAt: Date): number {
  return Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
}

const SUMMARY_STAGES = [
  "DOCUMENT_COLLECTION",
  "SPREADING",
  "CREDIT_REVIEW",
  "CREDIT_COMMITTEE",
  "CLOSED",
] as const;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const where = {
    bankId: session.user.bankId,
    ...(session.user.role === "BANKER" ? { bankerId: session.user.id } : {}),
  };

  const deals = await prisma.deal.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      documentChecklist: { select: { required: true, uploaded: true } },
      activityLogs: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const templateCount = await prisma.spreadTemplate.count({
    where: { bankId: session.user.bankId },
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const dealItems: DealListItem[] = deals.map((deal) => ({
    id: deal.id,
    borrowerName: deal.borrowerName,
    loanType: deal.loanType,
    loanAmount: Number(deal.loanAmount),
    stage: deal.stage,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    internalName: deal.internalName,
    documentsUploaded: deal.documentChecklist.filter((d) => d.uploaded).length,
    documentsRequired: deal.documentChecklist.filter((d) => d.required).length,
    lastActivityAt: deal.activityLogs[0]?.createdAt ?? null,
    daysInStage: getDaysInStage(deal.updatedAt),
  }));

  const stageCounts = dealItems.reduce<Record<string, number>>((acc, d) => ({
    ...acc,
    [d.stage]: (acc[d.stage] ?? 0) + 1,
  }), {});

  const closedThisMonth = deals.filter(
    (d) => d.stage === "CLOSED" && new Date(d.updatedAt) >= startOfMonth
  ).length;

  const summaryStats = [
    { label: "Total Deals", value: deals.length },
    ...SUMMARY_STAGES.filter((s) => s !== "CLOSED").map((s) => ({
      label: DEAL_STAGE_LABELS[s],
      value: stageCounts[s] ?? 0,
    })),
    { label: "Closed This Month", value: closedThisMonth },
  ];

  const isNewBank = deals.length > 0 && deals.length < 3;

  return (
    <div style={{ padding: "24px 28px", background: "var(--bg-deep)", minHeight: "100vh" }}>
      {isNewBank && (
        <div style={{
          marginBottom: 20,
          padding: "12px 16px",
          borderRadius: "var(--r-md)",
          background: "var(--accent-glow)",
          border: "1px solid var(--accent-deep)",
          fontSize: 13,
          color: "var(--ink-2)",
        }}>
          <span style={{ fontWeight: 600, color: "var(--accent)" }}>Getting started: </span>
          Create a few deals, set up a spreading template, and send your first borrower portal link to collect documents automatically.
        </div>
      )}

      {deals.length === 0 ? (
        <OnboardingChecklist templateCount={templateCount} />
      ) : (
        <PipelineList deals={dealItems} />
      )}
    </div>
  );
}

function CheckItem({
  done,
  label,
  action,
}: {
  done: boolean;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <li style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          background: done ? "var(--accent-glow)" : "var(--panel-2)",
          color: done ? "var(--accent)" : "var(--ink-4)",
          border: done ? "1px solid var(--accent-deep)" : "1px solid var(--line-2)",
        }}>
          {done ? "✓" : "○"}
        </span>
        <span style={{
          fontSize: 13,
          color: done ? "var(--ink-4)" : "var(--ink)",
          textDecoration: done ? "line-through" : "none",
        }}>
          {label}
        </span>
      </div>
      {!done && action}
    </li>
  );
}

function OnboardingChecklist({ templateCount }: { templateCount: number }) {
  return (
    <div style={{
      borderRadius: "var(--r-lg)",
      border: "1px dashed var(--line-2)",
      background: "var(--panel)",
      padding: 32,
    }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Welcome to Tickr AI</h2>
      <p style={{ margin: "4px 0 24px", fontSize: 13, color: "var(--ink-4)" }}>Complete these steps to get started.</p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <CheckItem done label="Account created" />
        <CheckItem
          done={false}
          label="Create your first deal"
          action={
            <Link
              href="/deals/new"
              style={{
                padding: "6px 14px",
                borderRadius: "var(--r-md)",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Create Deal
            </Link>
          }
        />
        <CheckItem
          done={templateCount > 0}
          label="Set up a spreading template"
          action={
            <Link
              href="/admin/templates"
              style={{
                padding: "6px 14px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line-2)",
                background: "transparent",
                color: "var(--ink-3)",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Go to Templates
            </Link>
          }
        />
        <CheckItem
          done={false}
          label="Send a borrower portal link (create a deal first)"
          action={
            <span style={{
              padding: "6px 14px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line)",
              color: "var(--ink-4)",
              fontSize: 12,
              cursor: "not-allowed",
              opacity: 0.5,
            }}>
              Need a deal first
            </span>
          }
        />
      </ul>
    </div>
  );
}
