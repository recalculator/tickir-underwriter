"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutList, LayoutGrid } from "lucide-react";
import { StagesBadge } from "./StagesBadge";
import { LOAN_TYPE_LABELS, DEAL_STAGE_LABELS, DEAL_STAGES } from "@/lib/constants";
import type { DealListItem } from "@/types";
import type { DealStageType } from "@/types";

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

function DocProgress({ uploaded, required }: { uploaded: number; required: number }) {
  const pct = required === 0 ? 0 : Math.round((uploaded / required) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700">
        {uploaded}/{required}
      </span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function KanbanCard({ deal, onAdvance }: { deal: DealListItem; onAdvance: (id: string) => void }) {
  const loanLabel =
    LOAN_TYPE_LABELS[deal.loanType as keyof typeof LOAN_TYPE_LABELS] ?? deal.loanType;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm space-y-2">
      <Link href={`/deals/${deal.id}`} className="block text-sm font-semibold text-gray-900 hover:text-blue-600">
        {deal.borrowerName}
      </Link>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium">{loanLabel}</span>
        <span className="font-semibold text-gray-800">{formatCurrency(deal.loanAmount)}</span>
      </div>
      <DocProgress uploaded={deal.documentsUploaded} required={deal.documentsRequired} />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{deal.daysInStage}d in stage</span>
        {!["CLOSED", "DECLINED"].includes(deal.stage) && (
          <button
            onClick={() => onAdvance(deal.id)}
            className="rounded text-xs text-blue-600 hover:underline"
          >
            Move →
          </button>
        )}
      </div>
    </div>
  );
}

export function PipelineList({ deals }: Props) {
  const [view, setView] = useState<"list" | "kanban">("list");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const filtered = deals.filter((d) => {
    const matchesStage = stageFilter === "ALL" || d.stage === stageFilter;
    const matchesSearch =
      search.trim() === "" ||
      d.borrowerName.toLowerCase().includes(search.toLowerCase()) ||
      d.internalName.toLowerCase().includes(search.toLowerCase());
    return matchesStage && matchesSearch;
  });

  function handleAdvance(dealId: string) {
    fetch(`/api/deals/${dealId}/stage`, { method: "PATCH" })
      .then(() => window.location.reload())
      .catch(() => null);
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16">
        <p className="text-sm font-medium text-gray-900">No deals yet</p>
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStageFilter("ALL")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              stageFilter === "ALL"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {DEAL_STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                stageFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {DEAL_STAGE_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search borrower…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="flex rounded-md border border-gray-200 bg-white">
            <button
              onClick={() => setView("list")}
              className={`rounded-l-md p-1.5 ${view === "list" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`rounded-r-md p-1.5 ${view === "kanban" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Borrower", "Loan Type", "Amount", "Stage", "Docs", "Days Idle", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((deal) => {
                const loanLabel =
                  LOAN_TYPE_LABELS[deal.loanType as keyof typeof LOAN_TYPE_LABELS] ?? deal.loanType;
                const isIdleRed = deal.daysInStage > 3;

                return (
                  <tr key={deal.id} className="group transition hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/deals/${deal.id}`} className="block">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                          {deal.borrowerName}
                        </p>
                        <p className="text-xs text-gray-400">{deal.internalName}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{loanLabel}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(deal.loanAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <StagesBadge stage={deal.stage as DealStageType} />
                    </td>
                    <td className="px-4 py-3">
                      <DocProgress
                        uploaded={deal.documentsUploaded}
                        required={deal.documentsRequired}
                      />
                    </td>
                    <td
                      className={`px-4 py-3 text-sm font-medium ${
                        isIdleRed ? "text-red-600" : "text-gray-600"
                      }`}
                    >
                      {deal.daysInStage}d
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => {
            const stageDeals = filtered.filter((d) => d.stage === stage);
            return (
              <div key={stage} className="w-56 shrink-0">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {DEAL_STAGE_LABELS[stage]}
                  </span>
                  <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-bold text-gray-600">
                    {stageDeals.length}
                  </span>
                </div>
                <div className="space-y-2 rounded-lg bg-gray-100 p-2">
                  {stageDeals.length === 0 && (
                    <p className="py-4 text-center text-xs text-gray-400">Empty</p>
                  )}
                  {stageDeals.map((deal) => (
                    <KanbanCard key={deal.id} deal={deal} onAdvance={handleAdvance} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
