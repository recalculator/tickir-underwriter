"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewTemplateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create template");
      router.push(`/admin/templates/${data.data.id}`);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--line)",
        background: "var(--panel)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div>
        <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>
          Template Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          placeholder="e.g. SBA 7(a) Spread Template"
        />
      </div>
      {status === "error" && (
        <p style={{ fontSize: 13, color: "var(--s-dec)", margin: 0 }}>{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === "saving"}
        style={{
          alignSelf: "flex-start",
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
        {status === "saving" ? "Creating…" : "Create Template"}
      </button>
    </form>
  );
}
