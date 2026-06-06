import { validateToken } from "./validate-token";
import { PortalUploadClient } from "./PortalUploadClient";
import { TickrLogo } from "@/components/TickrLogo";
import Link from "next/link";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PortalPage({ params }: Props) {
  const { token } = await params;
  const record = await validateToken(token);

  if (!record) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--bg-deep)" }}>
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>Link Expired</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
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
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      {/* Top brand header */}
      <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TickrLogo size={28} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", lineHeight: 1 }}>Tickir AI</div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "var(--ink-4)", marginTop: 2 }}>CREDIT OS</div>
          </div>
        </div>
        <span style={{ fontSize: 13, color: "var(--ink-4)" }}>{deal.bank.name}</span>
      </div>

      <header className="px-6 pt-4" style={{ borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "var(--ink-4)" }}>{deal.bank.name}</p>
          <h1 className="mt-0.5 text-xl font-bold" style={{ color: "var(--ink)" }}>Document Upload Portal</h1>
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
              className="px-4 py-2 text-sm font-medium border-b-2 -mb-px border-transparent"
              style={{ color: "var(--ink-4)" }}
            >
              Application Status
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Welcome banner */}
        <div className="mb-6 rounded-lg px-5 py-4" style={{ background: "var(--panel)", border: "1px solid var(--line-2)", borderLeft: `3px solid ${bankColor}` }}>
          <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
            Welcome, {deal.borrowerName}!
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
            Please upload the documents below for your{" "}
            <span className="font-medium capitalize">{loanTypeLabel}</span> loan application.
          </p>
        </div>

        {allDone ? (
          /* All-done success screen */
          <div className="flex flex-col items-center rounded-xl py-14 px-8 text-center" style={{ background: "var(--panel)", border: "1px solid var(--line-2)" }}>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--accent-glow)" }}>
              <svg
                className="h-9 w-9"
                style={{ color: "var(--accent)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>You&apos;re all done!</h2>
            <p className="mt-3 max-w-sm text-sm" style={{ color: "var(--ink-3)" }}>
              Your documents have been received. Your banker will review them and be in touch
              shortly.
            </p>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="mb-6 rounded-lg p-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
              <div className="mb-2 flex justify-between text-sm font-medium">
                <span style={{ color: "var(--ink-2)" }}>Documents validated</span>
                <span style={{ color: "var(--ink)" }}>
                  {validated} of {total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--panel-hi)" }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: total > 0 ? `${Math.round((validated / total) * 100)}%` : "0%", background: "var(--accent)" }}
                />
              </div>
            </div>

            {/* What to expect */}
            <div className="mb-6 rounded-lg p-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-4)" }}>
                What to expect
              </p>
              <ol className="space-y-1.5 text-sm" style={{ color: "var(--ink-2)" }}>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
                    1
                  </span>
                  Upload each document below
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
                    2
                  </span>
                  We&apos;ll verify them automatically
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
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
