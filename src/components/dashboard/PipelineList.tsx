import Link from "next/link";
import { StagesBadge } from "./StagesBadge";
import { LOAN_TYPE_LABELS } from "@/lib/constants";
import type { DealListItem } from "@/types";

type Props = {
  deals: DealListItem[];
};

function formatCurrency(amount: unknown): string {
  const num = Number(amount);
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDaysAgo(date: Date | null): string {
  if (!date) return "—";
  const days = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function PipelineList({ deals }: Props) {
  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16">
        <p className="text-sm font-medium text-gray-900">No deals yet</p>
        <p className="mt-1 text-xs text-gray-500">
          Create your first deal to get started.
        </p>
        <Link
          href="/deals/new"
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Deal
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Borrower
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Loan Type
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Stage
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
              Days in Stage
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
              Docs
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Last Activity
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {deals.map((deal) => {
            const loanLabel =
              LOAN_TYPE_LABELS[deal.loanType as keyof typeof LOAN_TYPE_LABELS] ??
              deal.loanType;

            return (
              <tr
                key={deal.id}
                className="group transition hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <Link href={`/deals/${deal.id}`} className="block">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                      {deal.borrowerName}
                    </p>
                    <p className="text-xs text-gray-500">{deal.internalName}</p>
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{loanLabel}</td>
                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                  {formatCurrency(deal.loanAmount)}
                </td>
                <td className="px-4 py-3">
                  <StagesBadge
                    stage={
                      deal.stage as Parameters<typeof StagesBadge>[0]["stage"]
                    }
                  />
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">
                  {deal.daysInStage}d
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">
                  {deal.documentsUploaded}/{deal.documentsRequired}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-500">
                  {formatDaysAgo(deal.lastActivityAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
