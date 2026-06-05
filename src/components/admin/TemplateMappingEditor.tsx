"use client";

import { useState } from "react";

type CellRow = {
  cell_ref: string;
  label: string;
  source_doc_type: string;
  source_line_item: string;
};

function parseCells(json: string): CellRow[] | null {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return Object.entries(parsed).map(([cell_ref, v]) => {
      const obj = v as Record<string, string>;
      return {
        cell_ref,
        label: obj.label ?? "",
        source_doc_type: obj.source_doc_type ?? "",
        source_line_item: obj.source_line_item ?? "",
      };
    });
  } catch {
    return null;
  }
}

type Props = {
  templateId: string;
  initialCellsJson: string;
};

export function TemplateMappingEditor({ templateId, initialCellsJson }: Props) {
  const [json, setJson] = useState(initialCellsJson);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cells = parseCells(json);

  async function handleSave() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setStatus("error");
      setErrorMsg("Invalid JSON");
      return;
    }

    setStatus("saving");
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/templates/${templateId}/mapping`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cellsJson: parsed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error ?? "Save failed");
      }

      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          cellsJson
        </label>
        <textarea
          className="w-full rounded-md border border-gray-300 p-3 font-mono text-xs focus:border-blue-500 focus:outline-none"
          rows={20}
          value={json}
          onChange={(e) => { setJson(e.target.value); setStatus("idle"); }}
          spellCheck={false}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : "Save"}
          </button>
          {status === "saved" && (
            <span className="text-sm text-green-600">Saved</span>
          )}
          {status === "error" && (
            <span className="text-sm text-red-600">{errorMsg}</span>
          )}
        </div>
      </div>

      {cells !== null && cells.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["cell_ref", "label", "source_doc_type", "source_line_item"].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cells.map((row) => (
                <tr key={row.cell_ref} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">{row.cell_ref}</td>
                  <td className="px-4 py-2 text-gray-700">{row.label}</td>
                  <td className="px-4 py-2 text-gray-700">{row.source_doc_type}</td>
                  <td className="px-4 py-2 text-gray-700">{row.source_line_item}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
