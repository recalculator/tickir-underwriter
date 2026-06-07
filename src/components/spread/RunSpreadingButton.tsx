"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  dealId: string;
  templates: { id: string; name: string }[];
};

export function RunSpreadingButton({ dealId, templates }: Props) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleRun() {
    if (!templateId) return;
    setStatus("running");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/spread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected response" }));
      if (!res.ok) throw new Error(data.error ?? "Spreading failed");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Spreading failed");
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <select
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
        disabled={status === "running"}
        style={{
          borderRadius: "var(--r-md)",
          border: "1px solid var(--line-2)",
          background: "var(--panel-2)",
          color: "var(--ink)",
          padding: "8px 12px",
          fontSize: 13,
          outline: "none",
        }}
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id} style={{ background: "var(--bg-deep)" }}>
            {t.name}
          </option>
        ))}
      </select>

      <button
        onClick={handleRun}
        disabled={status === "running" || !templateId}
        style={{
          borderRadius: "var(--r-md)",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 700,
          border: "none",
          cursor: status === "running" ? "not-allowed" : "pointer",
          opacity: status === "running" ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {status === "running" && (
          <span style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.4)",
            borderTopColor: "white",
            display: "inline-block",
            animation: "spin 0.7s linear infinite",
          }} />
        )}
        {status === "running" ? "Spreading…" : "Run AI Spreading"}
      </button>

      {status === "running" && (
        <p style={{ fontSize: 12, color: "var(--ink-3)", margin: 0 }}>
          AI is reading documents and filling each cell — this takes 10–30 seconds.
        </p>
      )}
      {status === "error" && (
        <p style={{ fontSize: 12, color: "var(--s-dec)", margin: 0 }}>{errorMsg}</p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
