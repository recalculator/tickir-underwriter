import Link from "next/link";
import { StagesBadge } from "./StagesBadge";
import { LOAN_TYPE_LABELS } from "@/lib/constants";
import type { DealListItem } from "@/types";

type Props = {
  deal: DealListItem;
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
  if (!date) return "No activity";
  const days = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function DealCard({ deal }: Props) {
  const loanLabel =
    LOAN_TYPE_LABELS[deal.loanType as keyof typeof LOAN_TYPE_LABELS] ??
    deal.loanType;

  return (
    <Link
      href={`/deals/${deal.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">
            {deal.borrowerName}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {deal.internalName}
          </p>
        </div>
        <StagesBadge stage={deal.stage as Parameters<typeof StagesBadge>[0]["stage"]} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>{loanLabel}</span>
        <span className="font-semibold text-gray-900">
          {formatCurrency(deal.loanAmount)}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          Docs: {deal.documentsUploaded}/{deal.documentsRequired}
        </span>
        <span>
          {deal.daysInStage}d in stage · {formatDaysAgo(deal.lastActivityAt)}
        </span>
      </div>
    </Link>
  );
}
