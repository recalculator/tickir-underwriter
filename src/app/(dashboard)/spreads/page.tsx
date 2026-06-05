import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SpreadsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const spreads = await prisma.spread.findMany({
    where: { bankId: session.user.bankId },
    orderBy: { createdAt: "desc" },
    include: {
      deal: { select: { id: true, borrowerName: true, loanType: true, loanAmount: true } },
      template: { select: { name: true } },
      lockedBy: { select: { name: true } },
      spreadCells: { select: { confidenceTier: true } },
    },
  });

  return (
    <div style={{ padding: "32px 32px 0" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", margin: 0 }}>Spreads</h1>
        <p style={{ marginTop: 4, fontSize: 13, color: "var(--ink-3)" }}>
          All AI-generated financial spreads across your pipeline
        </p>
      </div>

      {spreads.length === 0 ? (
        <div style={{
          borderRadius: "var(--r-lg)",
          border: "1px dashed var(--line-2)",
          background: "var(--panel)",
          padding: "64px 24px",
          textAlign: "center",
        }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>No spreads yet</p>
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-3)" }}>
            Spreads are created from the deal page once documents are collected.{" "}
            <Link href="/dashboard" style={{ color: "var(--accent)", textDecoration: "none" }}>
              Go to Pipeline →
            </Link>
          </p>
        </div>
      ) : (
        <div style={{
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--line)",
          overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--panel-2)" }}>
                {["Borrower", "Loan Type", "Amount", "Template", "Cells", "Status", ""].map((h) => (
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
              {spreads.map((spread) => {
                const green = spread.spreadCells.filter(c => c.confidenceTier === "GREEN").length;
                const yellow = spread.spreadCells.filter(c => c.confidenceTier === "YELLOW").length;
                const red = spread.spreadCells.filter(c => c.confidenceTier === "RED").length;
                const locked = Boolean(spread.lockedAt);
                const amount = Number(spread.deal.loanAmount);
                const formatted = amount >= 1_000_000
                  ? `$${(amount / 1_000_000).toFixed(1)}M`
                  : amount >= 1_000
                  ? `$${(amount / 1_000).toFixed(0)}K`
                  : `$${amount}`;

                return (
                  <tr key={spread.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                        {spread.deal.borrowerName}
                      </p>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--ink-3)" }}>
                      {spread.deal.loanType.replace(/_/g, " ").toLowerCase()}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                      {formatted}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--ink-2)" }}>
                      {spread.template.name}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
                        {green > 0 && <span style={{ color: "var(--s-clo)", fontWeight: 600 }}>{green}G</span>}
                        {yellow > 0 && <span style={{ color: "var(--s-spr)", fontWeight: 600 }}>{yellow}Y</span>}
                        {red > 0 && <span style={{ color: "var(--s-dec)", fontWeight: 600 }}>{red}R</span>}
                        {spread.spreadCells.length === 0 && <span style={{ color: "var(--ink-4)" }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {locked ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 8px", borderRadius: 99, fontSize: 11.5, fontWeight: 500,
                          color: "var(--s-clo)",
                          background: "color-mix(in srgb, var(--s-clo) 12%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--s-clo) 25%, transparent)",
                        }}>
                          Locked
                        </span>
                      ) : (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 8px", borderRadius: 99, fontSize: 11.5, fontWeight: 500,
                          color: "var(--s-spr)",
                          background: "color-mix(in srgb, var(--s-spr) 12%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--s-spr) 25%, transparent)",
                        }}>
                          In review
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Link
                        href={`/deals/${spread.deal.id}/spread`}
                        style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                      >
                        Review →
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
