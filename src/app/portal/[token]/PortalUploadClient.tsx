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
    VALIDATING: "Validating…",
    VALID: "Validated",
    INVALID: "Invalid",
  };
  return labels[status];
}

function statusColor(status: DocStatus): string {
  const colors: Record<DocStatus, string> = {
    EMPTY: "text-gray-400",
    UPLOADING: "text-blue-500",
    VALIDATING: "text-yellow-500",
    VALID: "text-green-600",
    INVALID: "text-red-600",
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

  async function pollStatus(docId: string) {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) return;
      attempts++;

      try {
        const res = await fetch(`/api/portal/${token}/documents/${docId}/status`);
        const json = await res.json();

        if (!res.ok || !json.success) return;

        const docStatus: string = json.data.status;
        if (docStatus === "VALID") {
          setStatus("VALID");
          return;
        }
        if (docStatus === "INVALID") {
          setStatus("INVALID");
          setError(json.data.aiNotes ?? "Document could not be validated. Please re-upload.");
          return;
        }

        setTimeout(poll, 2000);
      } catch {
        setTimeout(poll, 2000);
      }
    };

    setTimeout(poll, 1500);
  }

  async function handleFile(file: File) {
    setError(null);
    setFileInfo({ name: file.name, sizeLabel: formatBytes(file.size) });
    setStatus("UPLOADING");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", checklistItem.docType);

      const res = await fetch(`/api/portal/${token}/upload`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setStatus("EMPTY");
        setError(json.error ?? "Upload failed. Please try again.");
        return;
      }

      setDocumentId(json.data.documentId);
      setStatus("VALIDATING");
      await pollStatus(json.data.documentId);
    } catch {
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

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{checklistItem.label}</p>
            {checklistItem.required && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                Required
              </span>
            )}
          </div>
          {checklistItem.description && (
            <p className="mt-0.5 text-xs text-gray-500">{checklistItem.description}</p>
          )}

          {/* Status row */}
          <div className="mt-1 flex items-center gap-1.5">
            {status === "VALIDATING" && (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
            )}
            {status === "VALID" && (
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === "INVALID" && (
              <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <p className={`text-xs font-medium ${statusColor(status)}`}>
              {statusLabel(status)}
            </p>
          </div>

          {/* File preview */}
          {fileInfo && (status === "UPLOADING" || status === "VALIDATING" || status === "VALID" || status === "INVALID") && (
            <p className="mt-1 text-xs text-gray-400 truncate">
              {fileInfo.name} &middot; {fileInfo.sizeLabel}
            </p>
          )}

          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

          {/* Format hint */}
          <p className="mt-1.5 text-xs text-gray-400">Accepted: PDF, JPG, PNG — Max 50MB</p>
        </div>

        {/* Drag-and-drop zone */}
        <div>
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
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-3 text-xs font-medium transition cursor-pointer select-none ${
              isProcessing
                ? "cursor-not-allowed opacity-50 border-gray-200 text-gray-400"
                : isDragOver
                ? "border-blue-500 bg-blue-50 text-blue-600"
                : "border-gray-300 text-gray-600 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            <svg
              className="mb-1 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {status === "VALID" ? "Replace" : "Upload"}
            <span className="text-gray-400">or drag &amp; drop</span>
          </div>
        </div>
      </div>
    </div>
  );
}
