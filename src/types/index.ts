import type { User, Deal, Bank, Document, DocumentChecklist } from "@prisma/client";
import type { DealStageType, LoanType } from "@/lib/constants";

export type { DealStageType, LoanType };

export type SafeUser = Omit<User, "hashedPassword">;

export type DealWithRelations = Deal & {
  banker: SafeUser;
  documents: Document[];
  documentChecklist: DocumentChecklist[];
  activityLogs: {
    id: string;
    createdAt: Date;
    actionType: string;
  }[];
};

export type DealListItem = Omit<
  Pick<
    Deal,
    | "id"
    | "borrowerName"
    | "loanType"
    | "loanAmount"
    | "stage"
    | "createdAt"
    | "updatedAt"
    | "internalName"
  >,
  "loanAmount"
> & {
  loanAmount: number;
  documentsUploaded: number;
  documentsRequired: number;
  lastActivityAt: Date | null;
  daysInStage: number;
};

export type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

export type PaginatedResponse<T> = {
  success: true;
  data: T[];
  error: null;
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  bankId: string;
};

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }

  interface User {
    role: string;
    bankId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    bankId: string;
  }
}
