import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PipelineList } from "@/components/dashboard/PipelineList";
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            {deals.length} active deal{deals.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/deals/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New Deal
        </Link>
      </div>

      <PipelineList deals={dealItems} />
    </div>
  );
}
