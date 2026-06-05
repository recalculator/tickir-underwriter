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
  borrowerEmail: string;
  documentChecklist: ChecklistItem[];
  documents: DocumentItem[];
  activityLogs: ActivityItem[];
  hasSpread: boolean;
  spreadSummary?: SpreadSummary;
};

type Props = { deal: DealData };

const DOC_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:    { label: "Not Uploaded", color: "var(--ink-4)" },
  UPLOADED:   { label: "Uploaded",     color: "var(--s-doc)" },
  PROCESSING: { label: "Validating",   color: "var(--s-spr)" },
  VALIDATED:  { label: "Valid",        color: "var(--s-clo)" },
  INVALID:    { label: "Invalid",      color: "var(--s-dec)" },
};

function getDocStatus(item: ChecklistItem, docs: DocumentItem[]): { label: string; color: string; aiNotes?: string | null } {
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
  DEAL_CREATED:       <Star size={14} style={{ color: "#d4b94a" }} />,
  DOCUMENT_UPLOADED:  <Upload size={14} style={{ color: "var(--s-doc)" }} />,
  DOCUMENT_VALIDATED: <CheckCircle size={14} style={{ color: "var(--s-clo)" }} />,
  SPREAD_LOCKED:      <BarChart2 size={14} style={{ color: "var(--s-com)" }} />,
  SPREAD_COMPLETE:    <BarChart2 size={14} style={{ color: "var(--s-com)" }} />,
  STAGE_ADVANCED:     <ArrowUpCircle size={14} style={{ color: "var(--s-doc)" }} />,
  CONSISTENCY_CHECK:  <CheckCircle size={14} style={{ color: "var(--accent)" }} />,
};

export function DealTabs({ deal }: Props) {
  const [tab, setTab] = useState<"documents" | "spread" | "activity">("documents");
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalCopied, setPortalCopied] = useState(false);
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);

  async function handleSendPortalLink() {
    setPortalLoading(true);
    setPortalCopied(false);
    try {
      const res = await fetch(`/api/deals/${deal.id}/portal-link`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const url = data.data?.portalUrl ?? data.data?.url ?? "";
        setPortalUrl(url);
        setSmtpConfigured(data.data?.smtpConfigured ?? false);
        setShowPortalModal(true);
      }
    } catch {
      // network error
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl).catch(() => null);
    setPortalCopied(true);
    setTimeout(() => setPortalCopied(false), 2000);
  }

  const docCount = deal.documentChecklist.length;
  const redCells = deal.spreadSummary?.red ?? 0;

  const tabs = [
    { key: "documents" as const, label: "Documents", badge: docCount > 0 ? String(docCount) : null },
    { key: "spread" as const, label: "Spread", badge: redCells > 0 ? `${redCells} flag${redCells > 1 ? "s" : ""}` : null },
    { key: "activity" as const, label: "Activity", badge: null },
  ];

  return (
    <>
      {showPortalModal && portalUrl && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.6)",
          padding: "0 16px",
        }}>
          <div style={{
            width: "100%",
            maxWidth: 440,
            borderRadius: "var(--r-xl)",
            border: "1px solid var(--line-2)",
            background: "var(--panel)",
            padding: 24,
            boxShadow: "var(--shadow)",
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Portal Link Ready</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 600, color: "var(--ink-4)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Portal URL
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  value={portalUrl}
                  onFocus={(e) => e.target.select()}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "var(--r-md)",
                    border: "1px solid var(--line-2)",
                    background: "var(--panel-2)",
                    color: "var(--ink-3)",
                    fontSize: 12,
                    fontFamily: "var(--font-geist-mono, ui-monospace)",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleCopyLink}
                  style={{
                    flexShrink: 0,
                    padding: "8px 14px",
                    borderRadius: "var(--r-md)",
                    border: "1px solid var(--line-2)",
                    background: "var(--panel-2)",
                    color: "var(--ink-2)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {portalCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div style={{
              padding: "10px 14px",
              borderRadius: "var(--r-md)",
              background: "var(--panel-2)",
              fontSize: 13,
              color: "var(--ink-3)",
              marginBottom: 20,
            }}>
              {smtpConfigured ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Email sent to <strong>{deal.borrowerEmail}</strong>
                </span>
              ) : (
                <span>
                  Copy and send to <strong>{deal.borrowerEmail}</strong> manually.
                </span>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowPortalModal(false)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "var(--r-md)",
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  fontSize: 13,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--line)",
        background: "var(--bg)",
        overflow: "hidden",
      }}>
        {/* Tab bar */}
        <div style={{ borderBottom: "1px solid var(--line)", padding: "0 20px", display: "flex", gap: 0 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "14px 4px",
                marginRight: 20,
                fontSize: 13,
                fontWeight: 500,
                color: tab === t.key ? "var(--ink)" : "var(--ink-4)",
                background: "none",
                border: "none",
                borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              {t.label}
              {t.badge && (
                <span style={{
                  padding: "1px 6px",
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  background: t.key === "spread" && redCells > 0 ? "color-mix(in oklch, var(--s-spr) 16%, transparent)" : "var(--panel-hi)",
                  color: t.key === "spread" && redCells > 0 ? "var(--s-spr)" : "var(--ink-3)",
                  border: `1px solid ${t.key === "spread" && redCells > 0 ? "color-mix(in oklch, var(--s-spr) 26%, transparent)" : "var(--line-2)"}`,
                }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: 24 }}>
          {tab === "documents" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink-3)" }}>Document Checklist</h2>
                <button
                  onClick={handleSendPortalLink}
                  disabled={portalLoading}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "var(--r-md)",
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    fontSize: 12,
                    fontWeight: 700,
                    border: "none",
                    cursor: portalLoading ? "not-allowed" : "pointer",
                    opacity: portalLoading ? 0.6 : 1,
                  }}
                >
                  {portalLoading ? "Generating…" : "Send Portal Link"}
                </button>
              </div>

              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                {deal.documentChecklist.map((item) => {
                  const status = getDocStatus(item, deal.documents);
                  return (
                    <li key={item.id} style={{
                      padding: "12px 14px",
                      borderRadius: "var(--r-md)",
                      background: "var(--panel)",
                      border: "1px solid var(--line)",
                      marginBottom: 4,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{item.label}</p>
                          {item.required && (
                            <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--ink-4)" }}>Required</p>
                          )}
                        </div>
                        <span style={{
                          padding: "3px 9px",
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 600,
                          color: status.color,
                          background: `color-mix(in srgb, ${status.color} 14%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${status.color} 26%, transparent)`,
                        }}>
                          {status.label}
                        </span>
                      </div>
                      {status.label === "Invalid" && status.aiNotes && (
                        <p style={{
                          margin: "8px 0 0",
                          fontSize: 12,
                          color: "var(--s-dec)",
                          background: "color-mix(in oklch, var(--s-dec) 10%, transparent)",
                          padding: "6px 10px",
                          borderRadius: "var(--r-sm)",
                        }}>
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
            <div>
              {deal.hasSpread ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {deal.spreadSummary && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[
                        { count: deal.spreadSummary.green, label: "green", color: "var(--s-clo)" },
                        { count: deal.spreadSummary.yellow, label: "yellow", color: "var(--s-spr)" },
                        { count: deal.spreadSummary.red, label: "red", color: "var(--s-dec)" },
                      ].map(({ count, label, color }) => (
                        <span key={label} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 12px",
                          borderRadius: 99,
                          fontSize: 12,
                          fontWeight: 600,
                          color,
                          background: `color-mix(in srgb, ${color} 14%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${color} 26%, transparent)`,
                        }}>
                          {count} {label}
                        </span>
                      ))}
                      {deal.spreadSummary.locked && (
                        <span style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 12px",
                          borderRadius: 99,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--ink-3)",
                          background: "var(--panel-2)",
                          border: "1px solid var(--line-2)",
                        }}>
                          <Lock size={11} /> Locked
                        </span>
                      )}
                    </div>
                  )}
                  <Link
                    href={`/deals/${deal.id}/spread`}
                    style={{
                      display: "inline-block",
                      padding: "8px 18px",
                      borderRadius: "var(--r-md)",
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    Review Spread
                  </Link>
                </div>
              ) : (
                <div style={{
                  padding: 48,
                  textAlign: "center",
                  borderRadius: "var(--r-lg)",
                  border: "1px dashed var(--line-2)",
                }}>
                  <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "var(--ink-3)" }}>No spread yet</p>
                  <Link
                    href={`/deals/${deal.id}/spread`}
                    style={{
                      display: "inline-block",
                      padding: "8px 18px",
                      borderRadius: "var(--r-md)",
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
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
                <p style={{ fontSize: 13, color: "var(--ink-4)" }}>No activity yet</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                  {deal.activityLogs.map((log) => (
                    <li key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{
                        marginTop: 2,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "var(--panel-2)",
                        border: "1px solid var(--line-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {ACTION_ICON_MAP[log.actionType] ?? <Circle size={12} style={{ color: "var(--ink-4)" }} />}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--ink)" }}>
                          <span style={{ fontWeight: 600 }}>{log.userName}</span>
                          {" — "}
                          {log.actionType.replace(/_/g, " ").toLowerCase()}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ink-4)" }}>
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
    </>
  );
}
