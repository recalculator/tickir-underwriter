"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Star,
  Upload,
  CheckCircle,
  BarChart2,
  ArrowUpCircle,
  Circle,
  Lock,
} from "lucide-react";

type ChecklistItem = {
  id: string;
  docType: string;
  label: string;
  required: boolean;
  uploaded: boolean;
  validated: boolean;
};

type DocumentItem = {
  id: string;
  docType: string;
  originalFilename: string;
  status: string;
  aiNotes: string | null;
};

type ActivityItem = {
  id: string;
  actionType: string;
  createdAt: Date | string;
  userName: string;
};

type SpreadSummary = {
  green: number;
  yellow: number;
  red: number;
  locked: boolean;
} | null;

type DealData = {
  id: string;
  internalName: string;
  documentChecklist: ChecklistItem[];
  documents: DocumentItem[];
  activityLogs: ActivityItem[];
  hasSpread: boolean;
  spreadSummary?: SpreadSummary;
};

type Props = { deal: DealData };

const DOC_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Not Uploaded", className: "bg-gray-100 text-gray-500" },
  UPLOADED: { label: "Uploaded", className: "bg-blue-100 text-blue-700" },
  PROCESSING: { label: "Validating", className: "bg-yellow-100 text-yellow-700" },
  VALIDATED: { label: "Valid", className: "bg-green-100 text-green-700" },
  INVALID: { label: "Invalid", className: "bg-red-100 text-red-700" },
};

function getDocStatus(item: ChecklistItem, docs: DocumentItem[]): { label: string; className: string; aiNotes?: string | null } {
  if (!item.uploaded) return DOC_STATUS_CONFIG.PENDING;
  const doc = docs.find((d) => d.docType === item.docType);
  const cfg = DOC_STATUS_CONFIG[doc?.status ?? ""] ?? DOC_STATUS_CONFIG.UPLOADED;
  return { ...cfg, aiNotes: doc?.aiNotes };
}

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ACTION_ICON_MAP: Record<string, React.ReactNode> = {
  DEAL_CREATED: <Star className="h-4 w-4 text-yellow-500" />,
  DOCUMENT_UPLOADED: <Upload className="h-4 w-4 text-blue-500" />,
  DOCUMENT_VALIDATED: <CheckCircle className="h-4 w-4 text-green-500" />,
  SPREAD_LOCKED: <BarChart2 className="h-4 w-4 text-purple-500" />,
  SPREAD_COMPLETE: <BarChart2 className="h-4 w-4 text-purple-500" />,
  STAGE_ADVANCED: <ArrowUpCircle className="h-4 w-4 text-indigo-500" />,
  CONSISTENCY_CHECK: <CheckCircle className="h-4 w-4 text-teal-500" />,
};

export function DealTabs({ deal }: Props) {
  const [tab, setTab] = useState<"documents" | "spread" | "activity">("documents");
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalCopied, setPortalCopied] = useState(false);

  async function handleSendPortalLink() {
    setPortalLoading(true);
    setPortalCopied(false);
    try {
      const res = await fetch(`/api/deals/${deal.id}/portal-link`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const url = data.data?.portalUrl ?? data.data?.url ?? "";
        setPortalUrl(url);
        if (url) {
          await navigator.clipboard.writeText(url).catch(() => null);
          setPortalCopied(true);
        }
      }
    } catch {
      // network error
    } finally {
      setPortalLoading(false);
    }
  }

  const tabs = [
    { key: "documents" as const, label: "Documents" },
    { key: "spread" as const, label: "Spread" },
    { key: "activity" as const, label: "Activity" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 py-4 text-sm font-medium transition ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {tab === "documents" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Document Checklist</h2>
              <button
                onClick={handleSendPortalLink}
                disabled={portalLoading}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {portalLoading ? "Generating…" : "Send Portal Link"}
              </button>
            </div>

            {portalUrl && (
              <div className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
                {portalCopied && (
                  <span className="mr-2 rounded bg-blue-200 px-1.5 py-0.5 text-xs font-semibold">
                    Copied!
                  </span>
                )}
                <span className="break-all font-mono">{portalUrl}</span>
              </div>
            )}

            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {deal.documentChecklist.map((item) => {
                const status = getDocStatus(item, deal.documents);
                return (
                  <li key={item.id} className="flex flex-col gap-1 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        {item.required && (
                          <p className="text-xs text-gray-400">Required</p>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    {status.label === "Invalid" && status.aiNotes && (
                      <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                        {status.aiNotes}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {tab === "spread" && (
          <div className="space-y-4">
            {deal.hasSpread ? (
              <>
                {deal.spreadSummary && (
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {deal.spreadSummary.green} green
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1 text-sm font-medium text-yellow-700">
                      <Circle className="h-3.5 w-3.5" />
                      {deal.spreadSummary.yellow} yellow
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                      <Circle className="h-3.5 w-3.5" />
                      {deal.spreadSummary.red} red
                    </div>
                    {deal.spreadSummary.locked && (
                      <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                        <Lock className="h-3.5 w-3.5" />
                        Locked
                      </div>
                    )}
                  </div>
                )}
                <Link
                  href={`/deals/${deal.id}/spread`}
                  className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Review Spread
                </Link>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
                <p className="text-sm font-medium text-gray-700">No spread yet</p>
                <Link
                  href={`/deals/${deal.id}/spread`}
                  className="mt-3 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Run AI Spreading
                </Link>
              </div>
            )}
          </div>
        )}

        {tab === "activity" && (
          <div>
            {deal.activityLogs.length === 0 ? (
              <p className="text-sm text-gray-400">No activity yet</p>
            ) : (
              <ul className="space-y-4">
                {deal.activityLogs.map((log) => (
                  <li key={log.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      {ACTION_ICON_MAP[log.actionType] ?? (
                        <Circle className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">{log.userName}</span>
                        {" — "}
                        {log.actionType.replace(/_/g, " ").toLowerCase()}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {relativeTime(log.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
