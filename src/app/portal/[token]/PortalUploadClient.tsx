"use client";

import { useState, useRef } from "react";

type ChecklistItem = {
  id: string;
  docType: string;
  label: string;
  description: string | null;
  required: boolean;
  uploaded: boolean;
  validated: boolean;
};

type Props = {
  token: string;
  checklistItem: ChecklistItem;
};

type DocStatus = "EMPTY" | "UPLOADING" | "VALIDATING" | "VALID" | "INVALID";

type FileInfo = { name: string; sizeLabel: string } | null;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(status: DocStatus): string {
  const labels: Record<DocStatus, string> = {
    EMPTY: "Not uploaded",
    UPLOADING: "Uploading…",
    VALIDATING: "Checking contents…",
    VALID: "Verified",
    INVALID: "Missing information",
  };
  return labels[status];
}

function statusColor(status: DocStatus): string {
  const colors: Record<DocStatus, string> = {
    EMPTY: "var(--ink-4)",
    UPLOADING: "var(--accent)",
    VALIDATING: "#d4b94a",
    VALID: "var(--accent)",
    INVALID: "#e05a5a",
  };
  return colors[status];
}

function deriveInitialStatus(item: ChecklistItem): DocStatus {
  if (item.validated) return "VALID";
  if (item.uploaded) return "VALIDATING";
  return "EMPTY";
}

export function PortalUploadClient({ token, checklistItem }: Props) {
  const [status, setStatus] = useState<DocStatus>(deriveInitialStatus(checklistItem));
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelPollingRef = useRef(false);

  async function pollStatus(docId: string) {
    cancelPollingRef.current = false;
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      if (cancelPollingRef.current || attempts >= maxAttempts) return;
      attempts++;

      try {
        const res = await fetch(`/api/portal/${token}/documents/${docId}/status`);
        const json = await res.json();

        if (cancelPollingRef.current) return;
        if (!res.ok || !json.success) return;

        const docStatus: string = json.data.status;
        if (docStatus === "VALID") {
          setStatus("VALID");
          return;
        }
        if (docStatus === "INVALID") {
          setStatus("INVALID");
          setError(json.data.aiNotes ?? "This document is missing required information. Please re-upload.");
          return;
        }

        setTimeout(poll, 2000);
      } catch {
        if (!cancelPollingRef.current) setTimeout(poll, 2000);
      }
    };

    setTimeout(poll, 1500);
  }

  async function handleCancel() {
    // Abort any in-flight upload
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Stop the polling loop
    cancelPollingRef.current = true;

    // Delete the document from storage + DB if it was already saved
    const docIdToDelete = documentId;
    setDocumentId(null);
    setFileInfo(null);
    setError(null);
    setStatus("EMPTY");

    if (docIdToDelete) {
      try {
        await fetch(`/api/portal/${token}/documents/${docIdToDelete}`, { method: "DELETE" });
      } catch {
        // Best-effort cleanup; UI is already reset
      }
    }
  }

  async function handleFile(file: File) {
    setError(null);
    setFileInfo({ name: file.name, sizeLabel: formatBytes(file.size) });
    setStatus("UPLOADING");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", checklistItem.docType);

      const res = await fetch(`/api/portal/${token}/upload`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      abortControllerRef.current = null;

      const json = await res.json();

      if (!res.ok || !json.success) {
        setStatus("EMPTY");
        setError(json.error ?? "Upload failed. Please try again.");
        return;
      }

      setDocumentId(json.data.documentId);
      setStatus("VALIDATING");
      await pollStatus(json.data.documentId);
    } catch (err) {
      abortControllerRef.current = null;
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled — state already reset by handleCancel
        return;
      }
      setStatus("EMPTY");
      setError("Network error. Please try again.");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await handleFile(file);
  }

  const isProcessing = status === "UPLOADING" || status === "VALIDATING";

  const dragZoneStyle: React.CSSProperties = isProcessing
    ? { borderColor: "var(--line-2)", color: "var(--ink-4)", opacity: 0.5, cursor: "not-allowed" }
    : isDragOver
    ? { borderColor: "var(--accent)", background: "var(--accent-glow)", color: "var(--accent)" }
    : { borderColor: "var(--line-2)", color: "var(--ink-3)" };

  return (
    <div className="rounded-lg p-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{checklistItem.label}</p>
            {checklistItem.required && (
              <span className="rounded px-1.5 py-0.5 text-xs" style={{ background: "var(--panel-hi)", color: "var(--ink-4)", border: "1px solid var(--line)" }}>
                Required
              </span>
            )}
          </div>
          {checklistItem.description && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--ink-4)" }}>{checklistItem.description}</p>
          )}

          {/* Status row */}
          <div className="mt-1 flex items-center gap-1.5">
            {status === "UPLOADING" && (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            )}
            {status === "VALIDATING" && (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "#d4b94a", borderTopColor: "transparent" }} />
            )}
            {status === "VALID" && (
              <svg className="h-4 w-4" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === "INVALID" && (
              <svg className="h-4 w-4" style={{ color: "#e05a5a" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <p className="text-xs font-medium" style={{ color: statusColor(status) }}>
              {statusLabel(status)}
            </p>
          </div>

          {/* File preview */}
          {fileInfo && status !== "EMPTY" && (
            <p className="mt-1 text-xs truncate" style={{ color: "var(--ink-4)" }}>
              {fileInfo.name} &middot; {fileInfo.sizeLabel}
            </p>
          )}

          {error && <p className="mt-1 text-xs" style={{ color: "#e05a5a" }}>{error}</p>}

          {/* Format hint */}
          <p className="mt-1.5 text-xs" style={{ color: "var(--ink-4)" }}>Accepted: PDF, JPG, PNG — Max 50MB</p>
        </div>

        {/* Right column: upload zone + cancel */}
        <div className="flex flex-col items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileChange}
            key={documentId}
          />
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-3 text-xs font-medium transition cursor-pointer select-none"
            style={dragZoneStyle}
          >
            <svg
              className="mb-1 h-5 w-5"
              style={{ color: "var(--ink-4)" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {status === "VALID" ? "Replace" : "Upload"}
            <span style={{ color: "var(--ink-4)" }}>or drag &amp; drop</span>
          </div>

          {/* Cancel button — shown while uploading or validating */}
          {isProcessing && (
            <button
              onClick={handleCancel}
              className="text-xs underline underline-offset-2 transition-colors"
              style={{ color: "var(--ink-4)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#e05a5a"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink-4)"; }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
