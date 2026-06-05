import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { translateActivityType } from "@/app/portal/[token]/status/stage-utils";
import type { ApiResponse } from "@/types";

type StatusResult = {
  stage: string;
  docsSubmitted: number;
  docsRequired: number;
  docsValidated: number;
  recentActivity: Array<{
    id: string;
    actionType: string;
    createdAt: string;
  }>;
};

async function getTokenRecord(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return prisma.borrowerToken.findUnique({
    where: { tokenHash },
    include: {
      deal: {
        include: {
          documentChecklist: true,
          activityLogs: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<ApiResponse<StatusResult>>> {
  const { token } = await params;

  let record;
  try {
    record = await getTokenRecord(token);
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Failed to validate token" },
      { status: 500 }
    );
  }

  if (!record) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  if (record.expiresAt < new Date()) {
    return NextResponse.json(
      { success: false, data: null, error: "Token has expired" },
      { status: 401 }
    );
  }

  const { deal } = record;
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

  return NextResponse.json({
    success: true,
    error: null,
    data: {
      stage: deal.stage,
      docsSubmitted,
      docsRequired,
      docsValidated,
      recentActivity,
    },
  });
}
