"use client";

import { useState } from "react";

const DOC_TYPES = [
  "BUSINESS_TAX_RETURN",
  "PERSONAL_TAX_RETURN",
  "FINANCIAL_STATEMENT",
  "RENT_ROLL",
  "OTHER",
];

const CELL_TYPES = ["input", "formula", "header"];

export type CellDef = {
  cell_ref: string;
  label: string;
  cell_type: string;
  source_doc_type: string;
  source_form: string;
  source_line_item: string;
  extraction_instructions: string;
  year_offset: number;
  confidence_threshold: number;
};

const EMPTY_CELL: CellDef = {
  cell_ref: "",
  label: "",
  cell_type: "input",
  source_doc_type: "FINANCIAL_STATEMENT",
  source_form: "",
  source_line_item: "",
  extraction_instructions: "",
  year_offset: 0,
  confidence_threshold: 0.85,
};

function parseCells(json: string): CellDef[] {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return [];
    return Object.entries(parsed).map(([ref, v]) => {
      const obj = (v ?? {}) as Partial<CellDef>;
      return {
        cell_ref: ref,
        label: obj.label ?? "",
        cell_type: obj.cell_type ?? "input",
        source_doc_type: obj.source_doc_type ?? "",
        source_form: obj.source_form ?? "",
        source_line_item: obj.source_line_item ?? "",
        extraction_instructions: obj.extraction_instructions ?? "",
        year_offset: obj.year_offset ?? 0,
        confidence_threshold: obj.confidence_threshold ?? 0.85,
      };
    });
  } catch {
    return [];
  }
}

function cellsToJson(cells: CellDef[]): string {
  const obj = Object.fromEntries(cells.map((c) => [c.cell_ref, c]));
  return JSON.stringify(obj, null, 2);
}

type Props = {
  templateId: string;
  initialCellsJson: string;
};

type EditingState = { type: "row"; idx: number } | { type: "new" } | null;

export function CellMappingEditor({ templateId, initialCellsJson }: Props) {
  const [activeTab, setActiveTab] = useState<"cells" | "raw">("cells");
  const [cells, setCells] = useState<CellDef[]>(() => parseCells(initialCellsJson));
  const [rawJson, setRawJson] = useState(initialCellsJson);
  const [editing, setEditing] = useState<EditingState>(null);
  const [editBuf, setEditBuf] = useState<CellDef>(EMPTY_CELL);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function syncCellsToRaw(updated: CellDef[]) {
    setCells(updated);
    setRawJson(cellsToJson(updated));
  }

  function syncRawToCells(raw: string) {
    setRawJson(raw);
    const parsed = parseCells(raw);
    setCells(parsed);
  }

  function startEditRow(idx: number) {
    setEditing({ type: "row", idx });
    setEditBuf({ ...cells[idx] });
  }

  function startAddRow() {
    setEditing({ type: "new" });
    setEditBuf({ ...EMPTY_CELL });
  }

  function cancelEdit() {
    setEditing(null);
  }

  function commitEdit() {
    if (!editBuf.cell_ref.trim()) return;
    if (editing?.type === "row") {
      const updated = cells.map((c, i) =>
        i === editing.idx ? { ...editBuf } : c
      );
      syncCellsToRaw(updated);
    } else if (editing?.type === "new") {
      syncCellsToRaw([...cells, { ...editBuf }]);
    }
    setEditing(null);
  }

  function deleteRow(idx: number) {
    syncCellsToRaw(cells.filter((_, i) => i !== idx));
    if (editing?.type === "row" && editing.idx === idx) setEditing(null);
  }

  async function handleSave() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
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

  const isEditingNew = editing?.type === "new";
  const isEditingRow = (idx: number) => editing?.type === "row" && editing.idx === idx;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", paddingBottom: 0 }}>
        {(["cells", "raw"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? "var(--accent)" : "var(--ink-3)",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {tab === "cells" ? "Cells" : "Raw JSON"}
          </button>
        ))}
      </div>

      {activeTab === "cells" && (
        <div style={{
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--line)",
          background: "var(--panel)",
          overflow: "hidden",
        }}>
          <div style={{ overflowX: "auto" }}>
            <table className="min-w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--panel-2)" }}>
                  {["Cell Ref", "Label", "Type", "Source Doc", "Source Line Item", "Actions"].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--ink-3)",
                        borderBottom: "1px solid var(--line)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cells.map((cell, idx) => (
                  isEditingRow(idx) ? (
                    <InlineEditRow
                      key={cell.cell_ref + idx}
                      buf={editBuf}
                      onChange={setEditBuf}
                      onCommit={commitEdit}
                      onCancel={cancelEdit}
                    />
                  ) : (
                    <tr
                      key={cell.cell_ref + idx}
                      style={{ borderBottom: "1px solid var(--line)" }}
                    >
                      <td style={{ padding: "8px 14px", fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{cell.cell_ref}</td>
                      <td style={{ padding: "8px 14px", color: "var(--ink-2)", fontSize: 13 }}>{cell.label || "—"}</td>
                      <td style={{ padding: "8px 14px", fontSize: 12 }}>
                        <span style={{
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 500,
                          background: "var(--panel-2)",
                          color: "var(--ink-3)",
                          border: "1px solid var(--line-2)",
                        }}>
                          {cell.cell_type}
                        </span>
                      </td>
                      <td style={{ padding: "8px 14px", fontSize: 12, color: "var(--ink-3)" }}>{cell.source_doc_type || "—"}</td>
                      <td style={{ padding: "8px 14px", fontSize: 12, color: "var(--ink-3)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cell.source_line_item || "—"}
                      </td>
                      <td style={{ padding: "8px 14px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => startEditRow(idx)}
                            style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRow(idx)}
                            style={{ fontSize: 12, color: "var(--s-dec)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}

                {isEditingNew && (
                  <InlineEditRow
                    key="new-row"
                    buf={editBuf}
                    onChange={setEditBuf}
                    onCommit={commitEdit}
                    onCancel={cancelEdit}
                  />
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={startAddRow}
              disabled={isEditingNew}
              style={{
                borderRadius: "var(--r-md)",
                border: "1px dashed var(--line-2)",
                background: "none",
                color: "var(--ink-3)",
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: isEditingNew ? "not-allowed" : "pointer",
                opacity: isEditingNew ? 0.5 : 1,
              }}
            >
              + Add Cell
            </button>
            <SaveControls status={status} errorMsg={errorMsg} onSave={handleSave} />
          </div>
        </div>
      )}

      {activeTab === "raw" && (
        <div style={{
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--line)",
          background: "var(--panel)",
          padding: 24,
        }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>
            cellsJson
          </label>
          <textarea
            style={{
              width: "100%",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line-2)",
              background: "var(--panel-2)",
              color: "var(--ink)",
              padding: 12,
              fontFamily: "monospace",
              fontSize: 12,
              outline: "none",
              boxSizing: "border-box",
              resize: "vertical",
            }}
            rows={24}
            value={rawJson}
            onChange={(e) => { syncRawToCells(e.target.value); setStatus("idle"); }}
            spellCheck={false}
          />
          <div className="mt-3">
            <SaveControls status={status} errorMsg={errorMsg} onSave={handleSave} />
          </div>
        </div>
      )}
    </div>
  );
}

function SaveControls({
  status,
  errorMsg,
  onSave,
}: {
  status: "idle" | "saving" | "saved" | "error";
  errorMsg: string | null;
  onSave: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={onSave}
        disabled={status === "saving"}
        style={{
          borderRadius: "var(--r-md)",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          padding: "8px 16px",
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
  );
}

function InlineEditRow({
  buf,
  onChange,
  onCommit,
  onCancel,
}: {
  buf: CellDef;
  onChange: (next: CellDef) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  function set<K extends keyof CellDef>(key: K, val: CellDef[K]) {
    onChange({ ...buf, [key]: val });
  }

  const inputStyle: React.CSSProperties = {
    borderRadius: "var(--r-md)",
    border: "1px solid var(--line-2)",
    background: "var(--panel-2)",
    color: "var(--ink)",
    padding: "4px 8px",
    fontSize: 12,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  return (
    <tr style={{ borderBottom: "1px solid var(--line)", background: "color-mix(in srgb, var(--accent) 4%, transparent)" }}>
      <td style={{ padding: "6px 10px" }}>
        <input
          style={inputStyle}
          value={buf.cell_ref}
          onChange={(e) => set("cell_ref", e.target.value)}
          placeholder="B5"
        />
      </td>
      <td style={{ padding: "6px 10px" }}>
        <input
          style={inputStyle}
          value={buf.label}
          onChange={(e) => set("label", e.target.value)}
          placeholder="Gross Revenue Y1"
        />
      </td>
      <td style={{ padding: "6px 10px" }}>
        <select
          style={selectStyle}
          value={buf.cell_type}
          onChange={(e) => set("cell_type", e.target.value)}
        >
          {CELL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      <td style={{ padding: "6px 10px" }}>
        <select
          style={selectStyle}
          value={buf.source_doc_type}
          onChange={(e) => set("source_doc_type", e.target.value)}
        >
          <option value="">—</option>
          {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      <td style={{ padding: "6px 10px" }}>
        <input
          style={inputStyle}
          value={buf.source_line_item}
          onChange={(e) => set("source_line_item", e.target.value)}
          placeholder="Total Revenue"
        />
      </td>
      <td style={{ padding: "6px 10px" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCommit}
            style={{ fontSize: 12, color: "var(--s-clo)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700 }}
          >
            Save
          </button>
          <button
            onClick={onCancel}
            style={{ fontSize: 12, color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}
