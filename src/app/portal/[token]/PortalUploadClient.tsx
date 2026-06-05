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
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function pollStatus(docId: string) {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) return;
      attempts++;

      try {
        const res = await fetch(
          `/api/portal/${token}/documents/${docId}/status`
        );
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
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

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
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
          <p className={`mt-1 text-xs font-medium ${statusColor(status)}`}>
            {statusLabel(status)}
          </p>
          {error && (
            <p className="mt-1 text-xs text-red-600">{error}</p>
          )}
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileChange}
            key={documentId}
          />
          <button
            type="button"
            disabled={status === "UPLOADING" || status === "VALIDATING"}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "VALID" ? "Replace" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
