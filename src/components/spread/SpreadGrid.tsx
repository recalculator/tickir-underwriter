"use client";

import { useState } from "react";
import type { SpreadCellData } from "./CellPanel";
import { CellPanel } from "./CellPanel";

type Props = {
  cells: SpreadCellData[];
  dealId: string;
  locked: boolean;
};

const tierRowStyle: Record<string, React.CSSProperties> = {
  GREEN: {
    background: "color-mix(in srgb, var(--s-clo) 8%, transparent)",
  },
  YELLOW: {
    background: "color-mix(in srgb, var(--s-spr) 8%, transparent)",
  },
  RED: {
    background: "color-mix(in srgb, var(--s-dec) 8%, transparent)",
    border: "1px solid color-mix(in srgb, var(--s-dec) 25%, transparent)",
  },
};

export function SpreadGrid({ cells, dealId, locked }: Props) {
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [cellMap, setCellMap] = useState<Map<string, SpreadCellData>>(
    () => new Map(cells.map((c) => [c.cellRef, c]))
  );

  const sorted = [...cellMap.values()].sort((a, b) => a.cellRef.localeCompare(b.cellRef));
  const selected = selectedRef ? cellMap.get(selectedRef) ?? null : null;

  function handleSave(cellRef: string, value: string) {
    const existing = cellMap.get(cellRef);
    if (!existing) return;
    const updated = new Map(cellMap);
    updated.set(cellRef, { ...existing, correctedValue: value });
    setCellMap(updated);
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 overflow-x-auto">
        <table
          className="min-w-full text-sm"
          style={{
            background: "var(--bg-deep)",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ background: "var(--panel-2)" }}>
              {["Cell", "Value", "Confidence", "Source"].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--ink-3)",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((cell) => (
              <tr
                key={cell.cellRef}
                onClick={() => setSelectedRef(cell.cellRef)}
                style={{
                  cursor: "pointer",
                  borderBottom: "1px solid var(--line)",
                  ...(tierRowStyle[cell.confidenceTier] ?? {}),
                  ...(selectedRef === cell.cellRef
                    ? { outline: "2px solid var(--accent)", outlineOffset: "-2px" }
                    : {}),
                }}
              >
                <td style={{ padding: "8px 16px", fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                  {cell.cellRef}
                </td>
                <td style={{ padding: "8px 16px", color: "var(--ink-2)" }}>
                  {cell.correctedValue ?? cell.value ?? "—"}
                </td>
                <td style={{ padding: "8px 16px", color: "var(--ink-3)" }}>
                  {cell.confidence ? `${Math.round(Number(cell.confidence) * 100)}%` : "—"}
                </td>
                <td style={{ padding: "8px 16px", color: "var(--ink-3)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cell.sourceDoc ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="w-80 shrink-0">
          <CellPanel
            cell={selected}
            dealId={dealId}
            locked={locked}
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  );
}
