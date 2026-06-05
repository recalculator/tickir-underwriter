import { validateToken } from "./validate-token";
import { PortalUploadClient } from "./PortalUploadClient";
import Link from "next/link";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PortalPage({ params }: Props) {
  const { token } = await params;
  const record = await validateToken(token);

  if (!record) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900">Link Expired</h1>
          <p className="mt-2 text-sm text-gray-600">
            This document upload link has expired or is invalid. Please contact your banker to
            request a new link.
          </p>
        </div>
      </div>
    );
  }

  const { deal } = record;
  const checklist = deal.documentChecklist;
  const validated = checklist.filter((c) => c.validated).length;
  const total = checklist.length;
  const allDone = total > 0 && validated === total;
  const bankColor = deal.bank.primaryColor ?? "#2563eb";
  const loanTypeLabel = deal.loanType.replace(/_/g, " ").toLowerCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Colored bank header bar */}
      <div style={{ backgroundColor: bankColor }} className="py-3 px-6">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <span className="text-lg font-bold text-white">Tickr AI</span>
          <span className="text-sm text-white/80">{deal.bank.name}</span>
        </div>
      </div>

      <header className="border-b border-gray-200 bg-white px-6 pt-4">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">{deal.bank.name}</p>
          <h1 className="mt-0.5 text-xl font-bold text-gray-900">Document Upload Portal</h1>
          <nav className="mt-4 flex gap-0">
            <Link
              href={`/portal/${token}`}
              className="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
              style={{ borderColor: bankColor, color: bankColor }}
            >
              Upload Documents
            </Link>
            <Link
              href={`/portal/${token}/status`}
              className="px-4 py-2 text-sm font-medium border-b-2 -mb-px border-transparent text-gray-500 hover:text-gray-700"
            >
              Application Status
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Welcome banner */}
        <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-base font-semibold text-blue-900">
            Welcome, {deal.borrowerName}!
          </p>
          <p className="mt-1 text-sm text-blue-700">
            Please upload the documents below for your{" "}
            <span className="font-medium capitalize">{loanTypeLabel}</span> loan application.
          </p>
        </div>

        {allDone ? (
          /* All-done success screen */
          <div className="flex flex-col items-center rounded-xl border border-green-200 bg-green-50 py-14 px-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-9 w-9 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-900">You&apos;re all done!</h2>
            <p className="mt-3 max-w-sm text-sm text-green-700">
              Your documents have been received. Your banker will review them and be in touch
              shortly.
            </p>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-2 flex justify-between text-sm font-medium">
                <span className="text-gray-700">Documents validated</span>
                <span className="text-gray-900">
                  {validated} of {total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all"
                  style={{ width: total > 0 ? `${Math.round((validated / total) * 100)}%` : "0%" }}
                />
              </div>
            </div>

            {/* What to expect */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                What to expect
              </p>
              <ol className="space-y-1.5 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    1
                  </span>
                  Upload each document below
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    2
                  </span>
                  We&apos;ll verify them automatically
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    3
                  </span>
                  Your banker will be in touch
                </li>
              </ol>
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              {checklist.map((item) => (
                <PortalUploadClient
                  key={item.id}
                  token={token}
                  checklistItem={{
                    id: item.id,
                    docType: item.docType,
                    label: item.label,
                    description: item.description,
                    required: item.required,
                    uploaded: item.uploaded,
                    validated: item.validated,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
