import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function validateToken(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const record = await prisma.borrowerToken.findUnique({
    where: { tokenHash },
    include: {
      deal: {
        include: {
          bank: true,
          documentChecklist: { orderBy: { createdAt: "asc" } },
          activityLogs: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          banker: true,
        },
      },
    },
  });

  if (!record) return null;
  if (record.expiresAt < new Date()) return null;

  return record;
}
