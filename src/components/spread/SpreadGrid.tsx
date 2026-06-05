"use client";

import { useState } from "react";
import type { SpreadCellData } from "./CellPanel";
import { CellPanel } from "./CellPanel";

type Props = {
  cells: SpreadCellData[];
  dealId: string;
  locked: boolean;
};

const tierBg: Record<string, string> = {
  GREEN: "bg-green-50 hover:bg-green-100",
  YELLOW: "bg-yellow-50 hover:bg-yellow-100",
  RED: "bg-red-50 border border-red-300 hover:bg-red-100",
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
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Cell
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Confidence
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((cell) => (
              <tr
                key={cell.cellRef}
                onClick={() => setSelectedRef(cell.cellRef)}
                className={`cursor-pointer ${tierBg[cell.confidenceTier] ?? ""} ${selectedRef === cell.cellRef ? "ring-2 ring-inset ring-blue-400" : ""}`}
              >
                <td className="px-4 py-2 font-mono text-xs font-semibold text-gray-800">
                  {cell.cellRef}
                </td>
                <td className="px-4 py-2 text-gray-700">
                  {cell.correctedValue ?? cell.value ?? "—"}
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {cell.confidence ? `${Math.round(Number(cell.confidence) * 100)}%` : "—"}
                </td>
                <td className="px-4 py-2 text-gray-500 truncate max-w-[160px]">
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
