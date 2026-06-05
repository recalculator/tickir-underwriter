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
    take: 50,
    include: {
      documentChecklist: { select: { required: true, uploaded: true } },
      activityLogs: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

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

  const stageCounts = dealItems.reduce<Record<string, number>>((acc, deal) => {
    return { ...acc, [deal.stage]: (acc[deal.stage] ?? 0) + 1 };
  }, {});

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

      {deals.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(stageCounts).map(([stage, count]) => (
            <div
              key={stage}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-center shadow-sm"
            >
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {DEAL_STAGE_LABELS[stage as keyof typeof DEAL_STAGE_LABELS] ?? stage}
              </p>
            </div>
          ))}
        </div>
      )}

      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-20">
          <p className="text-base font-medium text-gray-900">No deals yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Create your first deal to get started.
          </p>
          <Link
            href="/deals/new"
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create your first deal
          </Link>
        </div>
      ) : (
        <PipelineList deals={dealItems} />
      )}
    </div>
  );
}
