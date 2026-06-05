import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const spread = await prisma.spread.findFirst({
    where: { dealId: id, deal: { bankId: session.user.bankId } },
    orderBy: { createdAt: "desc" },
    include: { spreadCells: true, deal: { select: { internalName: true } } },
  });

  if (!spread) {
    return new NextResponse("No spread found", { status: 404 });
  }

  const rows = spread.spreadCells.map((c) => ({
    cell_ref: c.cellRef,
    value: c.correctedValue ?? c.value ?? "",
    confidence_tier: c.confidenceTier,
    confidence: c.confidence ? `${Math.round(Number(c.confidence) * 100)}%` : "",
    source: c.sourceDoc ?? "",
    source_page: c.sourcePage ?? "",
    corrected: c.correctedValue ? "Yes" : "No",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Spread");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `spread_${spread.deal.internalName.replace(/[^a-z0-9]/gi, "_")}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
