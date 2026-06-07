"use client";

import { useState } from "react";

export type SpreadCellData = {
  id: string;
  cellRef: string;
  value: string | null;
  confidence: string | null;
  confidenceTier: "GREEN" | "YELLOW" | "RED";
  sourceDoc: string | null;
  sourcePage: number | null;
  sourceLine: string | null;
  formulaExplanation: string | null;
  flagReason: string | null;
  correctedValue: string | null;
  correctedAt: Date | string | null;
};

type Props = {
  cell: SpreadCellData;
  dealId: string;
  locked: boolean;
  label?: string;
  onSave: (cellRef: string, value: string) => void;
};

const tierBadgeStyle: Record<string, React.CSSProperties> = {
  GREEN: {
    color: "var(--s-clo)",
    background: "color-mix(in srgb, var(--s-clo) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--s-clo) 30%, transparent)",
  },
  YELLOW: {
    color: "var(--s-spr)",
    background: "color-mix(in srgb, var(--s-spr) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--s-spr) 30%, transparent)",
  },
  RED: {
    color: "var(--s-dec)",
    background: "color-mix(in srgb, var(--s-dec) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--s-dec) 30%, transparent)",
  },
};

export function CellPanel({ cell, dealId, locked, label, onSave }: Props) {
  const [editValue, setEditValue] = useState(cell.correctedValue ?? cell.value ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSave() {
    setStatus("saving");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/spread/cells/${encodeURIComponent(cell.cellRef)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correctedValue: editValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error ?? "Save failed");
      }
      setStatus("saved");
      onSave(cell.cellRef, editValue);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div style={{
      borderRadius: "var(--r-lg)",
      border: "1px solid var(--line)",
      background: "var(--panel)",
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      <div className="flex items-center gap-3">
        <div>
          {label && (
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{label}</div>
          )}
          <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}>{cell.cellRef}</span>
        </div>
        <span style={{
          borderRadius: 999,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 500,
          ...(tierBadgeStyle[cell.confidenceTier] ?? {}),
        }}>
          {cell.confidenceTier}
        </span>
      </div>

      <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
        <div>
          <span style={{ color: "var(--ink-3)" }}>AI value: </span>
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{cell.value ?? "—"}</span>
        </div>
        {cell.correctedValue && (
          <div>
            <span style={{ color: "var(--ink-3)" }}>Corrected: </span>
            <span style={{ fontWeight: 600, color: "var(--accent)" }}>{cell.correctedValue}</span>
          </div>
        )}
        {cell.sourceDoc && (
          <div>
            <span style={{ color: "var(--ink-3)" }}>Source: </span>
            <span style={{ color: "var(--ink-2)" }}>{cell.sourceDoc}</span>
            {cell.sourcePage && <span style={{ color: "var(--ink-4)" }}>, p.{cell.sourcePage}</span>}
            {cell.sourceLine && (
              <span style={{ color: "var(--ink-4)" }}> — &ldquo;{cell.sourceLine}&rdquo;</span>
            )}
          </div>
        )}
        {cell.confidenceTier === "YELLOW" && cell.formulaExplanation && (
          <div style={{
            marginTop: 8,
            borderRadius: "var(--r-md)",
            background: "color-mix(in srgb, var(--s-spr) 10%, transparent)",
            padding: "10px 12px",
            fontSize: 12,
            color: "var(--s-spr)",
          }}>
            <strong>Explanation:</strong> {cell.formulaExplanation}
          </div>
        )}
        {cell.confidenceTier === "RED" && (
          <div style={{
            marginTop: 8,
            borderRadius: "var(--r-md)",
            background: "color-mix(in srgb, var(--s-dec) 10%, transparent)",
            padding: "10px 12px",
            fontSize: 12,
            color: "var(--s-dec)",
          }}>
            <strong>Flag:</strong> {cell.flagReason ?? "Low confidence — fill manually"}
          </div>
        )}
      </div>

      {!locked && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Override value</label>
          <input
            type="text"
            style={{
              width: "100%",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line-2)",
              background: "var(--panel-2)",
              color: "var(--ink)",
              padding: "8px 12px",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
            value={editValue}
            onChange={(e) => { setEditValue(e.target.value); setStatus("idle"); }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={status === "saving"}
              style={{
                borderRadius: "var(--r-md)",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                cursor: status === "saving" ? "not-allowed" : "pointer",
                opacity: status === "saving" ? 0.6 : 1,
              }}
            >
              {status === "saving" ? "Saving…" : "Save"}
            </button>
            {status === "saved" && <span style={{ fontSize: 13, color: "var(--s-clo)" }}>Saved</span>}
            {status === "error" && <span style={{ fontSize: 13, color: "var(--s-dec)" }}>{errorMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
