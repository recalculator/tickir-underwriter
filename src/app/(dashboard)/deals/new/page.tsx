"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LOAN_TYPES, LOAN_TYPE_LABELS } from "@/lib/constants";

const LOAN_TYPE_DESCRIPTIONS: Record<string, string> = {
  OWNER_OCCUPIED_CRE: "Commercial real estate where the borrower occupies >51% of the property.",
  BUSINESS_ACQUISITION: "Financing for purchasing an existing business.",
  EQUIPMENT: "Financing for machinery, vehicles, or equipment purchases.",
  CI_LINE_OF_CREDIT: "Revolving credit facility for working capital needs.",
};

export default function NewDealPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    borrowerName: "",
    borrowerEmail: "",
    borrowerPhone: "",
    loanType: LOAN_TYPES[0] as string,
    loanAmount: "",
    internalName: "",
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          loanAmount: Number(form.loanAmount),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to create deal");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Deal</h1>
        <p className="mt-1 text-sm text-gray-500">Start a new commercial lending deal.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Borrower Info
            </h2>

            <div>
              <label className={labelClass}>Borrower Name</label>
              <input
                required
                type="text"
                value={form.borrowerName}
                onChange={(e) => updateField("borrowerName", e.target.value)}
                className={inputClass}
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label className={labelClass}>Borrower Email</label>
              <input
                required
                type="email"
                value={form.borrowerEmail}
                onChange={(e) => updateField("borrowerEmail", e.target.value)}
                className={inputClass}
                placeholder="owner@acme.com"
              />
            </div>

            <div>
              <label className={labelClass}>Borrower Phone</label>
              <input
                type="tel"
                value={form.borrowerPhone}
                onChange={(e) => updateField("borrowerPhone", e.target.value)}
                className={inputClass}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Deal Info
            </h2>

            <div>
              <label className={labelClass}>Loan Type</label>
              <select
                required
                value={form.loanType}
                onChange={(e) => updateField("loanType", e.target.value)}
                className={inputClass}
              >
                {LOAN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {LOAN_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              {form.loanType && (
                <p className="mt-1.5 text-xs text-gray-500">
                  {LOAN_TYPE_DESCRIPTIONS[form.loanType] ?? ""}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Loan Amount</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400">
                  $
                </span>
                <input
                  required
                  type="number"
                  min="1"
                  step="1000"
                  value={form.loanAmount}
                  onChange={(e) => updateField("loanAmount", e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 pl-7 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="1,000,000"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Internal Deal Name</label>
              <input
                required
                type="text"
                value={form.internalName}
                onChange={(e) => updateField("internalName", e.target.value)}
                className={inputClass}
                placeholder="Acme-CRE-2024-001"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Deal"}
          </button>
        </div>
      </form>
    </div>
  );
}
