import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DOC_TYPES_BY_LOAN_TYPE, DOC_TYPE_LABELS } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  const existingBank = await prisma.bank.findFirst({
    where: { subdomain: "first-valley-bank" },
  });

  if (existingBank) {
    console.log("Seed data already exists. Skipping.");
    return;
  }

  const bank = await prisma.bank.create({
    data: {
      name: "First Valley Bank",
      subdomain: "first-valley-bank",
      primaryColor: "#2563eb",
    },
  });

  const hashedPassword = await bcrypt.hash("Password123!", 12);

  const [admin, banker, analyst] = await Promise.all([
    prisma.user.create({
      data: {
        bankId: bank.id,
        name: "Admin User",
        email: "admin@firstvalley.com",
        role: "ADMIN",
        hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        bankId: bank.id,
        name: "Banker User",
        email: "banker@firstvalley.com",
        role: "BANKER",
        hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        bankId: bank.id,
        name: "Analyst User",
        email: "analyst@firstvalley.com",
        role: "ANALYST",
        hashedPassword,
      },
    }),
  ]);

  const creDocTypes = DOC_TYPES_BY_LOAN_TYPE["OWNER_OCCUPIED_CRE"];
  const creChecklist = creDocTypes.map((docType) => ({
    bankId: bank.id,
    docType,
    label: DOC_TYPE_LABELS[docType] ?? docType,
    required: true,
    uploaded: false,
    validated: false,
  }));

  const deal1 = await prisma.deal.create({
    data: {
      bankId: bank.id,
      bankerId: banker.id,
      borrowerName: "Acme Properties LLC",
      borrowerEmail: "contact@acmeproperties.com",
      borrowerPhone: "555-100-2000",
      loanType: "OWNER_OCCUPIED_CRE",
      loanAmount: 1250000,
      internalName: "Acme-CRE-2024-001",
      stage: "DOCUMENT_COLLECTION",
      documentChecklist: { create: creChecklist },
      activityLogs: {
        create: {
          bankId: bank.id,
          userId: banker.id,
          actionType: "DEAL_CREATED",
          metadataJson: { loanType: "OWNER_OCCUPIED_CRE", loanAmount: 1250000 },
        },
      },
    },
  });

  const equipDocTypes = DOC_TYPES_BY_LOAN_TYPE["EQUIPMENT"];
  const equipChecklist = equipDocTypes.map((docType) => ({
    bankId: bank.id,
    docType,
    label: DOC_TYPE_LABELS[docType] ?? docType,
    required: true,
    uploaded: true,
    validated: true,
  }));

  const deal2 = await prisma.deal.create({
    data: {
      bankId: bank.id,
      bankerId: banker.id,
      borrowerName: "Blue Ridge Manufacturing Inc",
      borrowerEmail: "finance@blueridgemfg.com",
      borrowerPhone: "555-200-3000",
      loanType: "EQUIPMENT",
      loanAmount: 450000,
      internalName: "BlueRidge-EQ-2024-002",
      stage: "SPREADING",
      documentChecklist: { create: equipChecklist },
      activityLogs: {
        create: [
          {
            bankId: bank.id,
            userId: banker.id,
            actionType: "DEAL_CREATED",
            metadataJson: { loanType: "EQUIPMENT", loanAmount: 450000 },
          },
          {
            bankId: bank.id,
            userId: analyst.id,
            actionType: "STAGE_CHANGED",
            metadataJson: { from: "DOCUMENT_COLLECTION", to: "SPREADING" },
          },
        ],
      },
    },
  });

  console.log("\n=== Seed Summary ===");
  console.log(`Bank: ${bank.name} (subdomain: ${bank.subdomain})`);
  console.log(`Users created: 3`);
  console.log(`  - ${admin.email} (ADMIN)`);
  console.log(`  - ${banker.email} (BANKER)`);
  console.log(`  - ${analyst.email} (ANALYST)`);
  console.log(`Deals created: 2`);
  console.log(`  - ${deal1.internalName} [DOCUMENT_COLLECTION]`);
  console.log(`  - ${deal2.internalName} [SPREADING]`);
  console.log(`Password for all users: Password123!`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
