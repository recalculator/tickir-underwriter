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
    loanAmount: deal.loanAmount,
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            {deals.length} deal{deals.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/deals/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New Deal
        </Link>
      </div>

      {isNewBank && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span className="font-semibold">Getting started:</span> Create a few deals, set up a spreading template, and send your first borrower portal link to collect documents automatically.
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summaryStats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-center shadow-sm"
          >
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

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
    <li className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            done ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
          }`}
        >
          {done ? "✓" : "○"}
        </span>
        <span className={`text-sm ${done ? "text-gray-400 line-through" : "text-gray-800"}`}>
          {label}
        </span>
      </div>
      {!done && action}
    </li>
  );
}

function OnboardingChecklist({ templateCount }: { templateCount: number }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8">
      <h2 className="mb-1 text-base font-semibold text-gray-900">Welcome to LendFlow</h2>
      <p className="mb-6 text-sm text-gray-500">Complete these steps to get started.</p>
      <ul className="space-y-4">
        <CheckItem done label="Account created" />
        <CheckItem
          done={false}
          label="Create your first deal"
          action={
            <Link
              href="/deals/new"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
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
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Go to Templates
            </Link>
          }
        />
        <CheckItem
          done={false}
          label="Send a borrower portal link (create a deal first)"
          action={
            <span className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-300 cursor-not-allowed">
              Need a deal first
            </span>
          }
        />
      </ul>
    </div>
  );
}
