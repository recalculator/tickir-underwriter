import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SpreadGrid, type CellDefMeta } from "@/components/spread/SpreadGrid";
import type { SpreadCellData } from "@/components/spread/CellPanel";

type PageProps = { params: Promise<{ id: string }> };

export default async function SpreadPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const deal = await prisma.deal.findFirst({
    where: { id, bankId: session.user.bankId },
    select: { id: true, internalName: true, borrowerName: true },
  });

  if (!deal) notFound();

  const [spread, templates] = await Promise.all([
    prisma.spread.findFirst({
      where: { dealId: id },
      orderBy: { createdAt: "desc" },
      include: {
        spreadCells: true,
        lockedBy: { select: { name: true } },
        template: { select: { cellsJson: true } },
      },
    }),
    prisma.spreadTemplate.findMany({
      where: { bankId: session.user.bankId },
      select: { id: true, name: true },
      take: 10,
    }),
  ]);

  const cells: SpreadCellData[] = (spread?.spreadCells ?? []).map((c) => ({
    id: c.id,
    cellRef: c.cellRef,
    value: c.value,
    confidence: c.confidence ? String(c.confidence) : null,
    confidenceTier: c.confidenceTier as "GREEN" | "YELLOW" | "RED",
    sourceDoc: c.sourceDoc,
    sourcePage: c.sourcePage,
    sourceLine: c.sourceLine,
    formulaExplanation: c.formulaExplanation,
    flagReason: c.flagReason,
    correctedValue: c.correctedValue,
    correctedAt: c.correctedAt,
  }));

  const locked = Boolean(spread?.lockedAt);
  const hasCells = cells.length > 0;
  const cellDefs = (spread?.template?.cellsJson ?? {}) as Record<string, CellDefMeta>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
            {deal.borrowerName} — Spread
          </h1>
          <p style={{ marginTop: 2, fontSize: 13, color: "var(--ink-3)" }}>{deal.internalName}</p>
        </div>
        <div className="flex items-center gap-3">
          {spread && !locked && <LockSpreadButton dealId={id} />}
          {spread && (
            <a
              href={`/api/deals/${id}/spread/export`}
              style={{
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line-2)",
                background: "var(--panel-2)",
                color: "var(--ink-2)",
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Export to Excel
            </a>
          )}
          <Link
            href={`/deals/${id}`}
            style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}
          >
            ← Deal
          </Link>
        </div>
      </div>

      {/* No spread yet — show template selector */}
      {!spread && (
        <div style={{
          borderRadius: "var(--r-lg)",
          border: "1px dashed var(--line)",
          background: "var(--panel)",
          padding: "64px 24px",
          textAlign: "center",
        }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0 }}>No spread yet</p>
          {templates.length === 0 ? (
            <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-3)" }}>
              Create a spreading template in{" "}
              <Link href="/admin/templates" style={{ color: "var(--accent)", textDecoration: "none" }}>
                Admin → Templates
              </Link>{" "}
              first.
            </p>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-4">
              <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Select a template and run AI spreading.</p>
              <RunSpreadingForm dealId={id} templates={templates} />
            </div>
          )}
        </div>
      )}

      {/* Spread exists with cells but not locked */}
      {spread && hasCells && !locked && (
        <div style={{
          borderRadius: "var(--r-md)",
          background: "color-mix(in srgb, var(--s-spr) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--s-spr) 30%, transparent)",
          padding: "12px 16px",
          fontSize: 13,
          color: "var(--s-spr)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span>Spreading complete — review each cell and correct any errors, then lock the spread.</span>
          <LockSpreadButton dealId={id} />
        </div>
      )}

      {/* Spread locked */}
      {spread && locked && (
        <div style={{
          borderRadius: "var(--r-md)",
          background: "color-mix(in srgb, var(--s-clo) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--s-clo) 30%, transparent)",
          padding: "12px 16px",
          fontSize: 13,
          color: "var(--s-clo)",
        }}>
          Locked by{" "}
          <span style={{ fontWeight: 600 }}>
            {(spread as { lockedBy?: { name: string } | null }).lockedBy?.name ?? "Unknown"}
          </span>{" "}
          on{" "}
          {spread.lockedAt
            ? new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }).format(new Date(spread.lockedAt))
            : "—"}
        </div>
      )}

      {spread && <SpreadGrid cells={cells} dealId={id} locked={locked} cellDefs={cellDefs} />}
    </div>
  );
}

function RunSpreadingForm({
  dealId,
  templates,
}: {
  dealId: string;
  templates: { id: string; name: string }[];
}) {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        const { redirect: serverRedirect } = await import("next/navigation");
        const { runSpreading } = await import("@/lib/spreading");
        const templateId = formData.get("templateId");
        if (typeof templateId !== "string" || !templateId) {
          serverRedirect(`/deals/${dealId}/spread`);
          return;
        }
        await runSpreading(dealId, templateId);
        serverRedirect(`/deals/${dealId}/spread`);
      }}
      className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
    >
      <select
        name="templateId"
        defaultValue={templates[0]?.id}
        style={{
          borderRadius: "var(--r-md)",
          border: "1px solid var(--line-2)",
          background: "var(--panel-2)",
          color: "var(--ink)",
          padding: "8px 12px",
          fontSize: 13,
          outline: "none",
        }}
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id} style={{ background: "var(--bg-deep)" }}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        style={{
          borderRadius: "var(--r-md)",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
        }}
      >
        Run AI Spreading
      </button>
    </form>
  );
}

function LockSpreadButton({ dealId }: { dealId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        const { redirect: serverRedirect } = await import("next/navigation");
        const { prisma: db } = await import("@/lib/prisma");
        const { getServerSession: getSession } = await import("next-auth");
        const { authOptions: opts } = await import("@/lib/auth");
        const session = await getSession(opts);
        if (!session?.user) return;
        const spread = await db.spread.findFirst({
          where: { dealId, deal: { bankId: session.user.bankId } },
          orderBy: { createdAt: "desc" },
        });
        if (!spread || spread.lockedAt) {
          serverRedirect(`/deals/${dealId}/spread`);
          return;
        }
        await db.$transaction([
          db.spread.update({
            where: { id: spread.id },
            data: { lockedAt: new Date(), lockedByUserId: session.user.id },
          }),
          db.activityLog.create({
            data: {
              dealId,
              bankId: spread.bankId,
              userId: session.user.id,
              actionType: "SPREAD_LOCKED",
              metadataJson: { spreadId: spread.id },
            },
          }),
        ]);
        serverRedirect(`/deals/${dealId}/spread`);
      }}
    >
      <button
        type="submit"
        style={{
          borderRadius: "var(--r-md)",
          border: "1px solid var(--line-2)",
          background: "var(--panel-2)",
          color: "var(--ink-2)",
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Lock Spread
      </button>
    </form>
  );
}
