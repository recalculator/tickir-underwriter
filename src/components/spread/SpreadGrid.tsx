"use client";

import { useState } from "react";
import type { SpreadCellData } from "./CellPanel";
import { CellPanel } from "./CellPanel";

export type CellDefMeta = {
  label?: string;
  source_doc_type?: string;
  year_offset?: number;
  cell_type?: string;
};

type Props = {
  cells: SpreadCellData[];
  dealId: string;
  locked: boolean;
  cellDefs?: Record<string, CellDefMeta>;
};

const tierPillStyle: Record<string, React.CSSProperties> = {
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

const tierRowStyle: Record<string, React.CSSProperties> = {
  GREEN: {
    background: "color-mix(in srgb, var(--s-clo) 5%, transparent)",
  },
  YELLOW: {
    background: "color-mix(in srgb, var(--s-spr) 5%, transparent)",
  },
  RED: {
    background: "color-mix(in srgb, var(--s-dec) 8%, transparent)",
    border: "1px solid color-mix(in srgb, var(--s-dec) 20%, transparent)",
  },
};

function formatCurrency(val: string | null | undefined): string {
  if (!val) return "—";
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

export function SpreadGrid({ cells, dealId, locked, cellDefs = {} }: Props) {
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [cellMap, setCellMap] = useState<Map<string, SpreadCellData>>(
    () => new Map(cells.map((c) => [c.cellRef, c]))
  );

  const sorted = [...cellMap.values()].sort((a, b) => a.cellRef.localeCompare(b.cellRef));
  const selected = selectedRef ? cellMap.get(selectedRef) ?? null : null;
  const selectedDef = selected ? cellDefs[selected.cellRef] : undefined;

  function handleSave(cellRef: string, value: string) {
    const existing = cellMap.get(cellRef);
    if (!existing) return;
    const updated = new Map(cellMap);
    updated.set(cellRef, { ...existing, correctedValue: value });
    setCellMap(updated);
  }

  // Summary counts
  const green = sorted.filter((c) => c.confidenceTier === "GREEN").length;
  const yellow = sorted.filter((c) => c.confidenceTier === "YELLOW").length;
  const red = sorted.filter((c) => c.confidenceTier === "RED").length;

  return (
    <div className="space-y-4">
      {/* Summary pills */}
      {sorted.length > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>Confidence:</span>
          <span style={{ borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, ...tierPillStyle.GREEN }}>
            {green} green
          </span>
          <span style={{ borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, ...tierPillStyle.YELLOW }}>
            {yellow} yellow
          </span>
          <span style={{ borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, ...tierPillStyle.RED }}>
            {red} red
          </span>
        </div>
      )}

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
                {["Label", "Value", "Confidence", "Source"].map((col) => (
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
              {sorted.map((cell) => {
                const def = cellDefs[cell.cellRef];
                const label = def?.label ?? cell.cellRef;
                const displayValue = cell.correctedValue ?? cell.value;

                return (
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
                    <td style={{ padding: "8px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{label}</div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>{cell.cellRef}</div>
                    </td>
                    <td style={{ padding: "8px 16px", color: "var(--ink-2)", fontWeight: displayValue ? 600 : 400 }}>
                      {formatCurrency(displayValue)}
                    </td>
                    <td style={{ padding: "8px 16px" }}>
                      <span style={{
                        borderRadius: 999,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        ...(tierPillStyle[cell.confidenceTier] ?? {}),
                      }}>
                        {cell.confidence ? `${Math.round(Number(cell.confidence) * 100)}%` : cell.confidenceTier}
                      </span>
                    </td>
                    <td style={{ padding: "8px 16px", color: "var(--ink-3)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                      {cell.sourceDoc ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="w-80 shrink-0">
            <CellPanel
              cell={selected}
              dealId={dealId}
              locked={locked}
              label={selectedDef?.label}
              onSave={handleSave}
            />
          </div>
        )}
      </div>
    </div>
  );
}
