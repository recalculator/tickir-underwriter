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
      style={{
        display: "block",
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--line)",
        background: "var(--panel)",
        padding: 16,
        textDecoration: "none",
        transition: "border-color 0.15s",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--ink)" }} className="truncate">
            {deal.borrowerName}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-3)" }} className="truncate">
            {deal.internalName}
          </p>
        </div>
        <StagesBadge stage={deal.stage as Parameters<typeof StagesBadge>[0]["stage"]} />
      </div>

      <div className="mt-3 flex items-center justify-between" style={{ fontSize: 12, color: "var(--ink-3)" }}>
        <span>{loanLabel}</span>
        <span style={{ fontWeight: 600, color: "var(--ink)" }}>
          {formatCurrency(deal.loanAmount)}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between" style={{ fontSize: 12, color: "var(--ink-4)" }}>
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
