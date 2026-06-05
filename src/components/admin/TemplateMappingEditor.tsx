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
          rows={20}
          value={json}
          onChange={(e) => { setJson(e.target.value); setStatus("idle"); }}
          spellCheck={false}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleSave}
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
          {status === "saved" && (
            <span style={{ fontSize: 13, color: "var(--s-clo)" }}>Saved</span>
          )}
          {status === "error" && (
            <span style={{ fontSize: 13, color: "var(--s-dec)" }}>{errorMsg}</span>
          )}
        </div>
      </div>

      {cells !== null && cells.length > 0 && (
        <div style={{
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--line)",
          background: "var(--panel)",
          overflow: "hidden",
        }}>
          <table className="min-w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--panel-2)" }}>
                {["cell_ref", "label", "source_doc_type", "source_line_item"].map((col) => (
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
              {cells.map((row) => (
                <tr key={row.cell_ref} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--ink-2)" }}>{row.cell_ref}</td>
                  <td style={{ padding: "8px 16px", color: "var(--ink-2)", fontSize: 13 }}>{row.label}</td>
                  <td style={{ padding: "8px 16px", color: "var(--ink-2)", fontSize: 13 }}>{row.source_doc_type}</td>
                  <td style={{ padding: "8px 16px", color: "var(--ink-2)", fontSize: 13 }}>{row.source_line_item}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
