"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LOAN_TYPES, LOAN_TYPE_LABELS } from "@/lib/constants";

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

      router.push(`/deals/${json.data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Deal</h1>
        <p className="mt-1 text-sm text-gray-500">
          Start a new commercial lending deal.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Borrower Name
            </label>
            <input
              required
              type="text"
              value={form.borrowerName}
              onChange={(e) => updateField("borrowerName", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Borrower Email
            </label>
            <input
              required
              type="email"
              value={form.borrowerEmail}
              onChange={(e) => updateField("borrowerEmail", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="owner@acme.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Borrower Phone
            </label>
            <input
              type="tel"
              value={form.borrowerPhone}
              onChange={(e) => updateField("borrowerPhone", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="(555) 555-5555"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Loan Type
            </label>
            <select
              required
              value={form.loanType}
              onChange={(e) => updateField("loanType", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {LOAN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {LOAN_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Loan Amount ($)
            </label>
            <input
              required
              type="number"
              min="1"
              step="1000"
              value={form.loanAmount}
              onChange={(e) => updateField("loanAmount", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="1000000"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Internal Deal Name
            </label>
            <input
              required
              type="text"
              value={form.internalName}
              onChange={(e) => updateField("internalName", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Acme-CRE-2024-001"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create Deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
