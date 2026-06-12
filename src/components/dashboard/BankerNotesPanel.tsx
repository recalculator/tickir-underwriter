"use client";

import { useState } from "react";
import { StickyNote } from "lucide-react";

type Props = {
  dealId: string;
  initialNotes: string | null;
  initialUpdatedAt: string | Date | null;
};

export function BankerNotesPanel({ dealId, initialNotes, initialUpdatedAt }: Props) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [updatedAt, setUpdatedAt] = useState<string | Date | null>(initialUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = notes !== savedNotes;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedNotes(data.data.bankerNotes ?? "");
        setNotes(data.data.bankerNotes ?? "");
        setUpdatedAt(data.data.bankerNotesUpdatedAt);
      } else {
        setError(data.error ?? "Failed to save notes");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <StickyNote size={14} style={{ color: "var(--accent)" }} />
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Banker Notes</h3>
        <span style={{ fontSize: 11, color: "var(--ink-4)" }}>
          (visible to the AI when drafting the credit memo)
        </span>
      </div>

      {error && <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--s-dec)" }}>{error}</p>}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add context, concerns, or commitments for this deal — e.g. relationship history, exceptions granted, follow-up items…"
        rows={6}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--line-2)",
          background: "var(--panel-2)",
          color: "var(--ink)",
          fontSize: 13,
          fontFamily: "inherit",
          resize: "vertical",
        }}
      />

      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 11, color: "var(--ink-4)" }}>
          {updatedAt ? `Last updated ${new Date(updatedAt).toLocaleString()}` : "Not yet saved"}
        </p>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{
            padding: "8px 18px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: saving || !dirty ? "not-allowed" : "pointer",
            opacity: saving || !dirty ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save Notes"}
        </button>
      </div>
    </div>
  );
}
