export const LOAN_TYPES = [
  "OWNER_OCCUPIED_CRE",
  "BUSINESS_ACQUISITION",
  "EQUIPMENT",
  "CI_LINE_OF_CREDIT",
] as const;

export type LoanType = (typeof LOAN_TYPES)[number];

export const DEAL_STAGES = [
  "DOCUMENT_COLLECTION",
  "SPREADING",
  "CREDIT_REVIEW",
  "CREDIT_COMMITTEE",
  "CLOSED",
  "DECLINED",
] as const;

export type DealStageType = (typeof DEAL_STAGES)[number];

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  OWNER_OCCUPIED_CRE: "Owner-Occupied CRE",
  BUSINESS_ACQUISITION: "Business Acquisition",
  EQUIPMENT: "Equipment",
  CI_LINE_OF_CREDIT: "C&I Line of Credit",
};

export const DEAL_STAGE_LABELS: Record<DealStageType, string> = {
  DOCUMENT_COLLECTION: "Document Collection",
  SPREADING: "Spreading",
  CREDIT_REVIEW: "Credit Review",
  CREDIT_COMMITTEE: "Credit Committee",
  CLOSED: "Closed",
  DECLINED: "Declined",
};

export const DEAL_STAGE_COLORS: Record<DealStageType, string> = {
  DOCUMENT_COLLECTION: "bg-blue-100 text-blue-800",
  SPREADING: "bg-yellow-100 text-yellow-800",
  CREDIT_REVIEW: "bg-orange-100 text-orange-800",
  CREDIT_COMMITTEE: "bg-purple-100 text-purple-800",
  CLOSED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-800",
};

export const DOC_TYPES_BY_LOAN_TYPE: Record<LoanType, string[]> = {
  OWNER_OCCUPIED_CRE: [
    "PERSONAL_TAX_RETURN_3YR",
    "BUSINESS_TAX_RETURN_3YR",
    "PERSONAL_FINANCIAL_STATEMENT",
    "RENT_ROLL",
    "OPERATING_STATEMENT",
    "PROPERTY_APPRAISAL",
    "PURCHASE_AGREEMENT",
  ],
  BUSINESS_ACQUISITION: [
    "PERSONAL_TAX_RETURN_3YR",
    "BUSINESS_TAX_RETURN_3YR",
    "PERSONAL_FINANCIAL_STATEMENT",
    "PURCHASE_AGREEMENT",
    "BUSINESS_VALUATION",
    "INTERIM_FINANCIALS",
  ],
  EQUIPMENT: [
    "PERSONAL_TAX_RETURN_2YR",
    "BUSINESS_TAX_RETURN_2YR",
    "EQUIPMENT_INVOICE",
    "PERSONAL_FINANCIAL_STATEMENT",
  ],
  CI_LINE_OF_CREDIT: [
    "PERSONAL_TAX_RETURN_2YR",
    "BUSINESS_TAX_RETURN_2YR",
    "PERSONAL_FINANCIAL_STATEMENT",
    "ACCOUNTS_RECEIVABLE_AGING",
    "ACCOUNTS_PAYABLE_AGING",
    "INTERIM_FINANCIALS",
  ],
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  PERSONAL_TAX_RETURN_3YR: "Personal Tax Returns (3 Years)",
  PERSONAL_TAX_RETURN_2YR: "Personal Tax Returns (2 Years)",
  BUSINESS_TAX_RETURN_3YR: "Business Tax Returns (3 Years)",
  BUSINESS_TAX_RETURN_2YR: "Business Tax Returns (2 Years)",
  PERSONAL_FINANCIAL_STATEMENT: "Personal Financial Statement",
  RENT_ROLL: "Rent Roll",
  OPERATING_STATEMENT: "Operating Statement",
  PROPERTY_APPRAISAL: "Property Appraisal",
  PURCHASE_AGREEMENT: "Purchase Agreement",
  BUSINESS_VALUATION: "Business Valuation",
  INTERIM_FINANCIALS: "Interim Financials",
  EQUIPMENT_INVOICE: "Equipment Invoice",
  ACCOUNTS_RECEIVABLE_AGING: "Accounts Receivable Aging",
  ACCOUNTS_PAYABLE_AGING: "Accounts Payable Aging",
};
