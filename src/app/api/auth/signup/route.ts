import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authLimiter } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

const signupSchema = z
  .object({
    bankName: z.string().min(2, "Bank name must be at least 2 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function buildUniqueSubdomain(base: string): Promise<string> {
  const slug = slugify(base);
  const existing = await prisma.bank.findMany({
    where: { subdomain: { startsWith: slug } },
    select: { subdomain: true },
  });

  if (!existing.some((b) => b.subdomain === slug)) {
    return slug;
  }

  let counter = 2;
  while (existing.some((b) => b.subdomain === `${slug}-${counter}`)) {
    counter++;
  }
  return `${slug}-${counter}`;
}

type SignupResult = { userId: string; bankId: string };

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<SignupResult>>> {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!authLimiter(ip)) {
    return NextResponse.json(
      { success: false, data: null, error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 422 }
    );
  }

  const { bankName, name, email, password } = parsed.data;

  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { success: false, data: null, error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const subdomain = await buildUniqueSubdomain(bankName);
  const hashedPassword = await bcrypt.hash(password, 12);

  const bank = await prisma.bank.create({
    data: {
      name: bankName,
      subdomain,
      primaryColor: "#2563eb",
    },
  });

  const user = await prisma.user.create({
    data: {
      bankId: bank.id,
      name,
      email,
      role: "ADMIN",
      hashedPassword,
    },
  });

  return NextResponse.json(
    { success: true, data: { userId: user.id, bankId: bank.id }, error: null },
    { status: 201 }
  );
}
