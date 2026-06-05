import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StagesBadge } from "@/components/dashboard/StagesBadge";
import { LOAN_TYPE_LABELS, DEAL_STAGE_LABELS } from "@/lib/constants";
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
        take: 20,
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!deal) notFound();

  const loanLabel =
    LOAN_TYPE_LABELS[deal.loanType as keyof typeof LOAN_TYPE_LABELS] ??
    deal.loanType;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {deal.borrowerName}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">{deal.internalName}</p>
        </div>
        <StagesBadge stage={deal.stage as DealStageType} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Deal Details
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Loan Type</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{loanLabel}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Loan Amount</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {formatCurrency(deal.loanAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Borrower Email</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {deal.borrowerEmail}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Borrower Phone</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {deal.borrowerPhone ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Banker</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {deal.banker.name}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {formatDate(deal.createdAt)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Document Checklist
            </h2>
            <ul className="space-y-2">
              {deal.documentChecklist.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="text-gray-700">{item.label}</span>
                  <span
                    className={`text-xs font-medium ${
                      item.validated
                        ? "text-green-600"
                        : item.uploaded
                        ? "text-yellow-600"
                        : "text-gray-400"
                    }`}
                  >
                    {item.validated
                      ? "Validated"
                      : item.uploaded
                      ? "Uploaded"
                      : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Stage Progress
            </h2>
            <ol className="space-y-2">
              {(Object.keys(DEAL_STAGE_LABELS) as DealStageType[]).map(
                (stage) => {
                  const isCurrent = stage === deal.stage;
                  return (
                    <li
                      key={stage}
                      className={`flex items-center gap-2 text-sm ${
                        isCurrent ? "font-semibold text-blue-600" : "text-gray-500"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isCurrent ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      />
                      {DEAL_STAGE_LABELS[stage]}
                    </li>
                  );
                }
              )}
            </ol>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Recent Activity
            </h2>
            {deal.activityLogs.length === 0 ? (
              <p className="text-sm text-gray-400">No activity yet</p>
            ) : (
              <ul className="space-y-3">
                {deal.activityLogs.map((log) => (
                  <li key={log.id} className="text-xs text-gray-600">
                    <span className="font-medium text-gray-900">
                      {log.user?.name ?? "System"}
                    </span>{" "}
                    {log.actionType.replace(/_/g, " ").toLowerCase()}
                    <br />
                    <span className="text-gray-400">
                      {formatDate(log.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
