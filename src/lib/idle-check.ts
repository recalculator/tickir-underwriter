import { prisma } from "./prisma";
import type { DealStage } from "@prisma/client";

type IdleRule = {
  stage: DealStage;
  thresholdDays: number;
  extraRoles?: string[];
};

const IDLE_RULES: IdleRule[] = [
  { stage: "DOCUMENT_COLLECTION" as DealStage, thresholdDays: 3 },
  { stage: "SPREADING" as DealStage, thresholdDays: 5 },
  { stage: "CREDIT_REVIEW" as DealStage, thresholdDays: 7, extraRoles: ["CREDIT_OFFICER"] },
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DEDUP_WINDOW_MS = 24 * MS_PER_DAY;

function daysIdle(updatedAt: Date): number {
  return Math.floor((Date.now() - updatedAt.getTime()) / MS_PER_DAY);
}

export async function checkIdleDeals(): Promise<void> {
  const activeDeals = await prisma.deal.findMany({
    where: {
      stage: { in: IDLE_RULES.map((r) => r.stage) },
    },
    select: {
      id: true,
      bankId: true,
      stage: true,
      updatedAt: true,
      bankerId: true,
    },
  });

  const now = new Date();
  const dedupCutoff = new Date(now.getTime() - DEDUP_WINDOW_MS);

  for (const deal of activeDeals) {
    const rule = IDLE_RULES.find((r) => r.stage === deal.stage);
    if (!rule) continue;

    const idle = daysIdle(deal.updatedAt);
    if (idle < rule.thresholdDays) continue;

    const template = `Deal idle for ${idle} days in ${deal.stage.replace(/_/g, " ").toLowerCase()}`;

    const recipientIds = new Set<string>();
    recipientIds.add(deal.bankerId);

    if (rule.extraRoles && rule.extraRoles.length > 0) {
      const extraUsers = await prisma.user.findMany({
        where: { bankId: deal.bankId, role: { in: rule.extraRoles as never[] } },
        select: { id: true },
      });
      for (const u of extraUsers) recipientIds.add(u.id);
    }

    for (const recipientId of recipientIds) {
      const existing = await prisma.notification.findFirst({
        where: {
          dealId: deal.id,
          recipientId,
          template,
          createdAt: { gte: dedupCutoff },
        },
      });
      if (existing) continue;

      await prisma.notification.create({
        data: {
          bankId: deal.bankId,
          recipientType: "BANKER",
          recipientId,
          dealId: deal.id,
          channel: "IN_APP",
          template,
        },
      });
    }
  }
}
