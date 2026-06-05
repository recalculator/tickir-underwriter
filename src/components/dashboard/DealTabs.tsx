"use client";

import { useState } from "react";
import Link from "next/link";

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

type DealData = {
  id: string;
  internalName: string;
  documentChecklist: ChecklistItem[];
  documents: DocumentItem[];
  activityLogs: ActivityItem[];
  hasSpread: boolean;
};

type Props = { deal: DealData };

const ACTION_ICONS: Record<string, string> = {
  DOCUMENT_UPLOADED: "📄",
  DOCUMENT_VALIDATED: "✅",
  STAGE_ADVANCED: "⬆️",
  SPREAD_LOCKED: "🔒",
  CONSISTENCY_CHECK: "🔍",
};

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function DealTabs({ deal }: Props) {
  const [tab, setTab] = useState<"documents" | "spread" | "activity">("documents");
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleSendPortalLink() {
    setPortalLoading(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/portal-link`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setPortalUrl(data.data.portalUrl ?? data.data.url ?? JSON.stringify(data.data));
      }
    } catch {
      // silently fail
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
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 pb-3 text-sm font-medium ${
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

      {tab === "documents" && (
        <div className="mt-4 space-y-4">
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
              Portal URL: <span className="break-all font-mono">{portalUrl}</span>
            </div>
          )}
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
                  {item.validated ? "Validated" : item.uploaded ? "Uploaded" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "spread" && (
        <div className="mt-4">
          {deal.hasSpread ? (
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-700">A spread exists for this deal.</p>
              <Link
                href={`/deals/${deal.id}/spread`}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                View Spread
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center">
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
        <div className="mt-4">
          {deal.activityLogs.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet</p>
          ) : (
            <ul className="space-y-3">
              {deal.activityLogs.map((log) => (
                <li key={log.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 text-base">
                    {ACTION_ICONS[log.actionType] ?? "🔹"}
                  </span>
                  <div>
                    <span className="font-medium text-gray-900">{log.userName}</span>
                    {" — "}
                    <span className="text-gray-600">
                      {log.actionType.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <br />
                    <span className="text-xs text-gray-400">{formatDate(log.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
