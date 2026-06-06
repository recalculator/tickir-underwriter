import Link from "next/link";
import { validateToken } from "../validate-token";
import { StatusRefresher } from "./StatusRefresher";
import { translateActivityType } from "./stage-utils";
import { TickrLogo } from "@/components/TickrLogo";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function StatusPage({ params }: Props) {
  const { token } = await params;
  const record = await validateToken(token);

  if (!record) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--bg-deep)" }}>
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>Link Expired</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
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
          <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "var(--ink-4)" }}>
            {deal.bank.name}
          </p>
          <h1 className="mt-0.5 text-xl font-bold" style={{ color: "var(--ink)" }}>Document Upload Portal</h1>
          <nav className="mt-4 flex gap-0">
            <Link
              href={`/portal/${token}`}
              className="px-4 py-2 text-sm font-medium border-b-2 -mb-px border-transparent"
              style={{ color: "var(--ink-4)" }}
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
        <div className="mb-6 rounded-lg px-5 py-4" style={{ background: "var(--panel)", border: "1px solid var(--line-2)", borderLeft: `3px solid ${bankColor}` }}>
          <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>Hi, {deal.borrowerName}!</p>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
            Track where your loan application stands below.
          </p>
        </div>

        <StatusRefresher
          token={token}
          bankColor={bankColor}
          initialData={initialData}
        />

        {/* Document checklist detail */}
        <div className="mt-6 rounded-lg p-5" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--ink-4)" }}>
            Document Checklist
          </h2>
          <ul className="space-y-2">
            {checklist.map((item) => {
              const statusLabel = item.validated
                ? "Verified"
                : item.uploaded
                ? "Submitted"
                : "Pending";
              const pillStyle: React.CSSProperties = item.validated
                ? { background: "var(--accent-glow)", color: "var(--accent)" }
                : item.uploaded
                ? { background: "rgba(107,168,229,0.15)", color: "#6ba8e5" }
                : { background: "var(--panel-hi)", color: "var(--ink-4)" };

              return (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm" style={{ color: "var(--ink-2)" }}>{item.label}</span>
                  <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium" style={pillStyle}>
                    {statusLabel}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
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
        <div className="mt-6 rounded-lg p-5" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
          <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--ink-2)" }}>Questions? Contact your banker</h2>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>{deal.banker.name}</p>
          <p className="text-xs" style={{ color: "var(--ink-4)" }}>{deal.bank.name}</p>
        </div>
      </main>
    </div>
  );
}
