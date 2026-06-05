import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CellDef = {
  cell_ref: string;
  label: string;
  cell_type: "input" | "formula" | "header";
  source_doc_type: string | null;
  source_form: string | null;
  source_line_item: string | null;
  extraction_instructions: string | null;
  year_offset: number;
  confidence_threshold: number;
};

const CELLS: CellDef[] = [
  {
    cell_ref: "B5",
    label: "Gross Revenue Y1",
    cell_type: "input",
    source_doc_type: "FINANCIAL_STATEMENT",
    source_form: "Income Statement / P&L",
    source_line_item: "Total Revenue",
    extraction_instructions:
      "Extract total gross revenue for the most recent fiscal year from the income statement or profit & loss statement. Look for 'Total Revenue', 'Gross Revenue', or 'Total Income' line.",
    year_offset: 0,
    confidence_threshold: 0.85,
  },
  {
    cell_ref: "C5",
    label: "Gross Revenue Y2",
    cell_type: "input",
    source_doc_type: "FINANCIAL_STATEMENT",
    source_form: "Income Statement / P&L",
    source_line_item: "Total Revenue",
    extraction_instructions:
      "Extract total gross revenue for the prior fiscal year (1 year ago). If the document shows multiple years, use the column for the prior year.",
    year_offset: -1,
    confidence_threshold: 0.85,
  },
  {
    cell_ref: "D5",
    label: "Gross Revenue Y3",
    cell_type: "input",
    source_doc_type: "FINANCIAL_STATEMENT",
    source_form: "Income Statement / P&L",
    source_line_item: "Total Revenue",
    extraction_instructions:
      "Extract total gross revenue for two fiscal years ago. If the document shows multiple years, use the oldest year column.",
    year_offset: -2,
    confidence_threshold: 0.8,
  },
  {
    cell_ref: "B8",
    label: "Net Operating Income Y1",
    cell_type: "input",
    source_doc_type: "FINANCIAL_STATEMENT",
    source_form: "Operating Statement / P&L",
    source_line_item: "Net Operating Income",
    extraction_instructions:
      "Extract Net Operating Income (NOI) for the most recent fiscal year. NOI = Gross Revenue minus Operating Expenses, before debt service and depreciation. Look for 'Net Operating Income', 'NOI', or 'Operating Income'.",
    year_offset: 0,
    confidence_threshold: 0.85,
  },
  {
    cell_ref: "C8",
    label: "Net Operating Income Y2",
    cell_type: "input",
    source_doc_type: "FINANCIAL_STATEMENT",
    source_form: "Operating Statement / P&L",
    source_line_item: "Net Operating Income",
    extraction_instructions:
      "Extract NOI for the prior fiscal year (1 year ago). Same calculation as Y1 but for prior period.",
    year_offset: -1,
    confidence_threshold: 0.85,
  },
  {
    cell_ref: "D8",
    label: "Net Operating Income Y3",
    cell_type: "input",
    source_doc_type: "FINANCIAL_STATEMENT",
    source_form: "Operating Statement / P&L",
    source_line_item: "Net Operating Income",
    extraction_instructions:
      "Extract NOI for two fiscal years ago. Same calculation as Y1 but for the oldest period shown.",
    year_offset: -2,
    confidence_threshold: 0.8,
  },
  {
    cell_ref: "B12",
    label: "Annual Debt Service",
    cell_type: "input",
    source_doc_type: "FINANCIAL_STATEMENT",
    source_form: "Cash Flow Statement or Debt Schedule",
    source_line_item: "Total Debt Service",
    extraction_instructions:
      "Extract total annual debt service (principal + interest payments) for all existing loans. Look for 'Total Debt Service', 'Mortgage Payments', or 'Loan Payments'. Sum all P&I payments if broken out separately.",
    year_offset: 0,
    confidence_threshold: 0.85,
  },
  {
    cell_ref: "B15",
    label: "Debt Service Coverage Ratio",
    cell_type: "formula",
    source_doc_type: null,
    source_form: null,
    source_line_item: null,
    extraction_instructions:
      "Divide NOI (B8) by Annual Debt Service (B12). Formula: =B8/B12. A DSCR >= 1.25 is typically required for approval. Do not extract from document — calculate from other cells.",
    year_offset: 0,
    confidence_threshold: 1.0,
  },
  {
    cell_ref: "B16",
    label: "Total Assets",
    cell_type: "input",
    source_doc_type: "BUSINESS_TAX_RETURN",
    source_form: "Form 1120 Schedule L / Balance Sheet",
    source_line_item: "Total Assets",
    extraction_instructions:
      "Extract total assets from Schedule L of the business tax return (Form 1120, 1120S) or from the balance sheet. Look for 'Total Assets' at the bottom of the asset section.",
    year_offset: 0,
    confidence_threshold: 0.85,
  },
  {
    cell_ref: "B17",
    label: "Total Liabilities",
    cell_type: "input",
    source_doc_type: "BUSINESS_TAX_RETURN",
    source_form: "Form 1120 Schedule L / Balance Sheet",
    source_line_item: "Total Liabilities",
    extraction_instructions:
      "Extract total liabilities from Schedule L of the business tax return (Form 1120, 1120S) or from the balance sheet. Look for 'Total Liabilities' which includes current and long-term liabilities.",
    year_offset: 0,
    confidence_threshold: 0.85,
  },
];

async function main() {
  const bank = await prisma.bank.findFirst();
  if (!bank) {
    console.error("No bank found in DB. Run prisma/seed.ts first.");
    process.exit(1);
  }

  // Build cellsJson as an object keyed by cell_ref
  const cellsJson = Object.fromEntries(CELLS.map((c) => [c.cell_ref, c]));

  const template = await prisma.spreadTemplate.create({
    data: {
      bankId: bank.id,
      name: "Standard CRE Template",
      cellsJson,
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
