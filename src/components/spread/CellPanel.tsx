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
  sourceLine: number | null;
  formulaExplanation: string | null;
  flagReason: string | null;
  correctedValue: string | null;
  correctedAt: Date | string | null;
};

type Props = {
  cell: SpreadCellData;
  dealId: string;
  locked: boolean;
  onSave: (cellRef: string, value: string) => void;
};

export function CellPanel({ cell, dealId, locked, onSave }: Props) {
  const [editValue, setEditValue] = useState(cell.correctedValue ?? cell.value ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const displayValue = cell.correctedValue ?? cell.value;

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

  const tierColors: Record<string, string> = {
    GREEN: "text-green-700 bg-green-50 border-green-200",
    YELLOW: "text-yellow-700 bg-yellow-50 border-yellow-200",
    RED: "text-red-700 bg-red-50 border-red-200",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold text-gray-800">{cell.cellRef}</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tierColors[cell.confidenceTier] ?? ""}`}
        >
          {cell.confidenceTier}
        </span>
      </div>

      <div className="text-sm space-y-1">
        <div>
          <span className="text-gray-500">AI value: </span>
          <span className="font-medium text-gray-900">{cell.value ?? "—"}</span>
        </div>
        {cell.correctedValue && (
          <div>
            <span className="text-gray-500">Corrected: </span>
            <span className="font-medium text-blue-700">{cell.correctedValue}</span>
          </div>
        )}
        {cell.sourceDoc && (
          <div>
            <span className="text-gray-500">Source: </span>
            <span className="text-gray-700">{cell.sourceDoc}</span>
            {cell.sourcePage && <span className="text-gray-500">, p.{cell.sourcePage}</span>}
          </div>
        )}
        {cell.confidenceTier === "YELLOW" && cell.formulaExplanation && (
          <div className="mt-2 rounded-md bg-yellow-50 p-3 text-xs text-yellow-800">
            <strong>Explanation:</strong> {cell.formulaExplanation}
          </div>
        )}
        {cell.confidenceTier === "RED" && (
          <div className="mt-2 rounded-md bg-red-50 p-3 text-xs text-red-800">
            <strong>Flag:</strong> {cell.flagReason ?? "Low confidence — fill manually"}
          </div>
        )}
      </div>

      {!locked && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600">Override value</label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={editValue}
            onChange={(e) => { setEditValue(e.target.value); setStatus("idle"); }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={status === "saving"}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {status === "saving" ? "Saving…" : "Save"}
            </button>
            {status === "saved" && <span className="text-sm text-green-600">Saved</span>}
            {status === "error" && <span className="text-sm text-red-600">{errorMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
