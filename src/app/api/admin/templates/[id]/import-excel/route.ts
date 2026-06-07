import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

type CellDef = {
  label: string;
  cell_type: string;
  year_offset: number;
  source_doc_type: string;
  source_form: string;
  source_line_item: string;
  extraction_instructions: string;
  confidence_threshold: number;
};

export async function POST(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const template = await prisma.spreadTemplate.findFirst({
    where: { id, bankId: session.user.bankId },
  });
  if (!template) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Template not found" },
      { status: 404 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Could not parse form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "No file provided" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Could not parse Excel file" },
      { status: 400 }
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Excel file has no sheets" },
      { status: 400 }
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const ref = sheet["!ref"];
  if (!ref) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "Sheet appears empty" },
      { status: 400 }
    );
  }

  const range = XLSX.utils.decode_range(ref);

  // Detect year columns in the header row (row 0): look for numeric years 2015–2035
  type YearCol = { col: number; year: number; offset: number };
  const yearCols: YearCol[] = [];
  for (let c = 1; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
    if (!cell) continue;
    const v = typeof cell.v === "number" ? cell.v : parseInt(String(cell.v ?? ""), 10);
    if (!isNaN(v) && v >= 2015 && v <= 2035) {
      yearCols.push({ col: c, year: v, offset: 0 });
    }
  }
  // Sort descending so most recent = offset 0
  yearCols.sort((a, b) => b.year - a.year);
  yearCols.forEach((yc, i) => { yc.offset = -i; });

  const cellsJson: Record<string, CellDef> = {};

  const startRow = yearCols.length > 0 ? 1 : 0;

  for (let r = startRow; r <= range.e.r; r++) {
    const labelCell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    if (!labelCell?.v) continue;
    const label = String(labelCell.v).trim();
    if (!label) continue;

    if (yearCols.length > 0) {
      for (const yc of yearCols) {
        const cellRef = XLSX.utils.encode_cell({ r, c: yc.col });
        cellsJson[cellRef] = {
          label: yearCols.length > 1 ? `${label} (${yc.year})` : label,
          cell_type: "input",
          year_offset: yc.offset,
          source_doc_type: "",
          source_form: "",
          source_line_item: label,
          extraction_instructions: "",
          confidence_threshold: 0.85,
        };
      }
    } else {
      // No year columns detected — one cell per row label
      const cellRef = XLSX.utils.encode_cell({ r, c: 1 });
      cellsJson[cellRef] = {
        label,
        cell_type: "input",
        year_offset: 0,
        source_doc_type: "",
        source_form: "",
        source_line_item: label,
        extraction_instructions: "",
        confidence_threshold: 0.85,
      };
    }
  }

  if (Object.keys(cellsJson).length === 0) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: "No cells could be extracted from this file. Ensure column A has row labels." },
      { status: 422 }
    );
  }

  return NextResponse.json({ success: true, data: { cellsJson }, error: null });
}
