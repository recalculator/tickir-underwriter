import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CellDef = {
  cell_ref: string;
  label: string;
  cell_type: "input" | "formula";
  source_doc_type: string | null;
  source_line_item: string | null;
  extraction_instructions: string | null;
  year_offset: number | null;
};

const CELLS: CellDef[] = [
  // Revenue
  {
    cell_ref: "B5",
    label: "Gross Revenue Y1",
    cell_type: "input",
    source_doc_type: "TAX_RETURN",
    source_line_item: "Gross receipts or sales",
    extraction_instructions: "Extract gross revenue for the most recent tax year from Form 1120S or Schedule C.",
    year_offset: 0,
  },
  {
    cell_ref: "C5",
    label: "Gross Revenue Y2",
    cell_type: "input",
    source_doc_type: "TAX_RETURN",
    source_line_item: "Gross receipts or sales",
    extraction_instructions: "Extract gross revenue for the prior tax year.",
    year_offset: -1,
  },
  {
    cell_ref: "D5",
    label: "Gross Revenue Y3",
    cell_type: "input",
    source_doc_type: "TAX_RETURN",
    source_line_item: "Gross receipts or sales",
    extraction_instructions: "Extract gross revenue for two years prior.",
    year_offset: -2,
  },
  // NOI
  {
    cell_ref: "B8",
    label: "Net Operating Income Y1",
    cell_type: "input",
    source_doc_type: "RENT_ROLL",
    source_line_item: "Net Operating Income",
    extraction_instructions: "Extract NOI from the property rent roll or operating statement for the current year.",
    year_offset: 0,
  },
  {
    cell_ref: "C8",
    label: "Net Operating Income Y2",
    cell_type: "input",
    source_doc_type: "RENT_ROLL",
    source_line_item: "Net Operating Income",
    extraction_instructions: "Extract NOI from the prior year operating statement.",
    year_offset: -1,
  },
  {
    cell_ref: "D8",
    label: "Net Operating Income Y3",
    cell_type: "input",
    source_doc_type: "RENT_ROLL",
    source_line_item: "Net Operating Income",
    extraction_instructions: "Extract NOI from two years prior operating statement.",
    year_offset: -2,
  },
  // Debt Service
  {
    cell_ref: "B12",
    label: "Annual Debt Service",
    cell_type: "input",
    source_doc_type: "DEBT_SCHEDULE",
    source_line_item: "Total annual debt service",
    extraction_instructions: "Sum all principal and interest payments for the year from the debt schedule or loan documents.",
    year_offset: 0,
  },
  // Ratios
  {
    cell_ref: "B15",
    label: "DSCR",
    cell_type: "formula",
    source_doc_type: null,
    source_line_item: null,
    extraction_instructions: "Calculated: NOI (B8) / Annual Debt Service (B12). Must be >= 1.25 for approval.",
    year_offset: 0,
  },
  {
    cell_ref: "B16",
    label: "LTV",
    cell_type: "formula",
    source_doc_type: null,
    source_line_item: null,
    extraction_instructions: "Calculated: Loan Amount / Appraised Value. Extract appraised value from appraisal report.",
    year_offset: 0,
  },
];

async function main() {
  const bank = await prisma.bank.findFirst();
  if (!bank) {
    console.error("No bank found in DB. Run prisma/seed.ts first.");
    process.exit(1);
  }

  const template = await prisma.spreadTemplate.create({
    data: {
      bankId: bank.id,
      name: "Standard CRE Template",
      cellsJson: CELLS,
    },
  });

  console.log(`Template created: ${template.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
