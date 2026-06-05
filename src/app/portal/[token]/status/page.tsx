import Link from "next/link";
import { validateToken } from "../validate-token";
import { StatusRefresher } from "./StatusRefresher";
import { translateActivityType } from "./stage-utils";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function StatusPage({ params }: Props) {
  const { token } = await params;
  const record = await validateToken(token);

  if (!record) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900">Link Expired</h1>
          <p className="mt-2 text-sm text-gray-600">
            This link has expired or is invalid. Please contact your banker to request a new link.
          </p>
        </div>
      </div>
    );
  }

  const { deal } = record;
  const bankColor = deal.bank.primaryColor ?? "#2563eb";
  const checklist = deal.documentChecklist;
  const docsRequired = checklist.length;
  const docsSubmitted = checklist.filter((c) => c.uploaded || c.validated).length;
  const docsValidated = checklist.filter((c) => c.validated).length;

  const recentActivity = deal.activityLogs
    .filter((log) => translateActivityType(log.actionType) !== null)
    .slice(0, 5)
    .map((log) => ({
      id: log.id,
      actionType: log.actionType,
      createdAt: log.createdAt.toISOString(),
    }));

  const initialData = {
    stage: deal.stage,
    docsSubmitted,
    docsRequired,
    docsValidated,
    recentActivity,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Colored bank header bar */}
      <div style={{ backgroundColor: bankColor }} className="py-3 px-6">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <span className="text-lg font-bold text-white">LendFlow</span>
          <span className="text-sm text-white/80">{deal.bank.name}</span>
        </div>
      </div>

      <header className="border-b border-gray-200 bg-white px-6 pt-4">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">
            {deal.bank.name}
          </p>
          <h1 className="mt-0.5 text-xl font-bold text-gray-900">Document Upload Portal</h1>
          <nav className="mt-4 flex gap-0">
            <Link
              href={`/portal/${token}`}
              className="px-4 py-2 text-sm font-medium border-b-2 -mb-px border-transparent text-gray-500 hover:text-gray-700"
            >
              Upload Documents
            </Link>
            <Link
              href={`/portal/${token}/status`}
              className="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
              style={{ borderColor: bankColor, color: bankColor }}
            >
              Application Status
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Welcome banner */}
        <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-base font-semibold text-blue-900">Hi, {deal.borrowerName}!</p>
          <p className="mt-1 text-sm text-blue-700">
            Track where your loan application stands below.
          </p>
        </div>

        <StatusRefresher
          token={token}
          bankColor={bankColor}
          initialData={initialData}
        />

        {/* Document checklist detail */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Document Checklist
          </h2>
          <ul className="space-y-2">
            {checklist.map((item) => {
              const statusLabel = item.validated
                ? "Verified"
                : item.uploaded
                ? "Submitted"
                : "Pending";
              const pillClass = item.validated
                ? "bg-green-100 text-green-700"
                : item.uploaded
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-500";

              return (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${pillClass}`}>
                    {statusLabel}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 border-t border-gray-100 pt-3">
            <Link
              href={`/portal/${token}`}
              className="text-sm font-medium"
              style={{ color: bankColor }}
            >
              Need to add more documents? →
            </Link>
          </div>
        </div>

        {/* Contact card */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Questions? Contact your banker</h2>
          <p className="text-sm text-gray-600">{deal.banker.name}</p>
          <p className="text-xs text-gray-400">{deal.bank.name}</p>
        </div>
      </main>
    </div>
  );
}
