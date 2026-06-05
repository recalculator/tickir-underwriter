import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SpreadGrid } from "@/components/spread/SpreadGrid";
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

  const spread = await prisma.spread.findFirst({
    where: { dealId: id },
    orderBy: { createdAt: "desc" },
    include: {
      spreadCells: true,
      lockedBy: { select: { name: true } },
    },
  });

  const templates = await prisma.spreadTemplate.findMany({
    where: { bankId: session.user.bankId },
    select: { id: true, name: true },
    take: 10,
  });

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{deal.borrowerName} — Spread</h1>
          <p className="text-sm text-gray-500">{deal.internalName}</p>
        </div>
        <div className="flex items-center gap-3">
          {spread && !locked && <LockSpreadButton dealId={id} />}
          {spread && (
            <a
              href={`/api/deals/${id}/spread/export`}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Export to Excel
            </a>
          )}
          <Link
            href={`/deals/${id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Deal
          </Link>
        </div>
      </div>

      {/* No spread yet — show template selector */}
      {!spread && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-base font-bold text-gray-900">No spread yet</p>
          {templates.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              Create a spreading template in{" "}
              <Link href="/admin/templates" className="text-blue-600 hover:underline">
                Admin → Templates
              </Link>{" "}
              first.
            </p>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-4">
              <p className="text-sm text-gray-500">Select a template and run AI spreading.</p>
              <RunSpreadingForm dealId={id} templates={templates} />
            </div>
          )}
        </div>
      )}

      {/* Spread exists with cells but not locked */}
      {spread && hasCells && !locked && (
        <div className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-center justify-between">
          <span>Spreading complete — review each cell and correct any errors, then lock the spread.</span>
          <LockSpreadButton dealId={id} />
        </div>
      )}

      {/* Spread locked */}
      {spread && locked && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          Locked by{" "}
          <span className="font-semibold">
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

      {spread && <SpreadGrid cells={cells} dealId={id} locked={locked} />}
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
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
        defaultValue={templates[0]?.id}
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        Lock Spread
      </button>
    </form>
  );
}
