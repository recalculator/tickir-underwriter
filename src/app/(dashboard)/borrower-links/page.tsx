import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function BorrowerLinksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const tokens = await prisma.borrowerToken.findMany({
    where: { deal: { bankId: session.user.bankId } },
    orderBy: { createdAt: "desc" },
    include: {
      deal: {
        select: {
          id: true,
          borrowerName: true,
          borrowerEmail: true,
          loanType: true,
          stage: true,
          documentChecklist: { select: { uploaded: true, validated: true, required: true } },
        },
      },
    },
    take: 50,
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return (
    <div style={{ padding: "32px 32px 0" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", margin: 0 }}>Borrower Links</h1>
        <p style={{ marginTop: 4, fontSize: 13, color: "var(--ink-3)" }}>
          Portal links sent to borrowers for document upload
        </p>
      </div>

      {tokens.length === 0 ? (
        <div style={{
          borderRadius: "var(--r-lg)",
          border: "1px dashed var(--line-2)",
          background: "var(--panel)",
          padding: "64px 24px",
          textAlign: "center",
        }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>No portal links yet</p>
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-3)" }}>
            Send a portal link from a deal page to give borrowers a secure upload link.{" "}
            <Link href="/dashboard" style={{ color: "var(--accent)", textDecoration: "none" }}>
              Go to Pipeline →
            </Link>
          </p>
        </div>
      ) : (
        <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--panel-2)" }}>
                {["Borrower", "Loan Type", "Documents", "Expires", "Status", ""].map((h) => (
                  <th key={h} style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--ink-3)",
                    borderBottom: "1px solid var(--line)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => {
                const expired = token.expiresAt < new Date();
                const validated = token.deal.documentChecklist.filter(d => d.validated).length;
                const required = token.deal.documentChecklist.filter(d => d.required).length;
                const allDone = required > 0 && validated >= required;
                const daysLeft = Math.ceil((token.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <tr key={token.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                        {token.deal.borrowerName}
                      </p>
                      <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-4)" }}>
                        {token.deal.borrowerEmail}
                      </p>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--ink-3)" }}>
                      {token.deal.loanType.replace(/_/g, " ").toLowerCase()}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, color: allDone ? "var(--s-clo)" : "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
                          {validated}/{required}
                        </span>
                        <div style={{ width: 60, height: 4, borderRadius: 99, background: "var(--line-2)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: required > 0 ? `${Math.round((validated / required) * 100)}%` : "0%",
                            borderRadius: 99,
                            background: allDone ? "var(--s-clo)" : "var(--ink-3)",
                          }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: expired ? "var(--s-dec)" : "var(--ink-3)" }}>
                      {expired ? "Expired" : `${daysLeft}d left`}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {allDone ? (
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--s-clo)" }}>✓ Complete</span>
                      ) : expired ? (
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--s-dec)" }}>Expired</span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--s-spr)" }}>Awaiting docs</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                      <Link
                        href={`/deals/${token.deal.id}`}
                        style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                      >
                        Deal →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
