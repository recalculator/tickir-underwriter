# Tickir Underwriter (Repo 2 of 2)

Banker-facing platform for commercial loan underwriting — document collection, AI-powered financial spreading, and deal pipeline management for regional banks. Receives matched borrower–lender deals from **Tickir Marketplace** (Repo 1) and carries them through document collection, spreading, credit review, and close.

Repo 1/2 link: https://github.com/recalculator/tickir-marketplace

## Stack

- **Framework**: Next.js 16 (App Router, TypeScript), React 19
- **Database**: PostgreSQL via Prisma ORM (`@prisma/adapter-pg` driver adapter)
- **Auth**: NextAuth.js (JWT sessions, credentials provider, role + bank-scoped sessions)
- **AI**: Anthropic Claude (`@anthropic-ai/sdk`) — document validation and financial spreading
- **Storage**: AWS S3 / Supabase Storage (with local-disk fallback for dev)
- **Email**: Nodemailer (SMTP) + Resend
- **Jobs**: BullMQ + Redis (idle-deal checks, background processing)

## Quick Start

```bash
cp .env.example .env.local
# Fill in DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY, and storage/email credentials

npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open http://localhost:3000. Without AWS/Supabase storage env vars configured, file uploads fall back to a local `.local-uploads/` directory for development only — **production deployments require real cloud storage** (Supabase Storage or AWS S3).

## Core Modules

| Module | Description |
|---|---|
| **Smart Document Collection** | Borrowers upload documents via a secure, token-based portal link (no account required). AI validates each document on upload. |
| **AI Financial Spreading** | Claude reads borrower financials and populates a bank's spreading template, scoring each cell with a confidence tier (Green ≥0.90, Yellow ≥0.70, Red <0.70) and citing its source document and line item. |
| **Deal Pipeline** | Kanban/list view of every deal moving through Document Collection → Spreading → Credit Review → Credit Committee → Closed, with idle-deal alerts and a full activity audit trail. |

## API Overview

| Area | Endpoints |
|---|---|
| Auth | `/api/auth/[...nextauth]`, `POST /api/auth/signup` |
| Deals | `/api/deals`, `/api/deals/:id`, `PUT /api/deals/:id/stage`, `POST /api/deals/:id/portal-link` |
| Spreading | `/api/deals/:id/spread`, `/api/deals/:id/spread/cells/:ref`, `POST /api/deals/:id/spread/lock`, `GET /api/deals/:id/spread/export` |
| Templates (admin) | `/api/admin/templates`, `/api/admin/templates/:id/mapping`, `POST /api/admin/templates/:id/import-excel`, `POST /api/admin/templates/:id/ai-enrich` |
| Borrower Portal | `/api/portal/:token/status`, `/api/portal/:token/upload`, `/api/portal/:token/upload/:docId`, `/api/portal/:token/documents/:docId`, `/api/portal/:token/documents/:docId/status` |
| Notifications | `/api/notifications`, `PUT /api/notifications/:id/read` |
| Cron | `/api/cron/idle-check` |
| Health | `/api/health` |

## Roles

| Role | Access |
|---|---|
| `BANKER` | Owns assigned deals; manages document collection, reviews spreads, advances stages |
| `ANALYST` | Supports spreading and credit review across the bank's deal pipeline |
| `CREDIT_OFFICER` | Reviews spreads and deal packages ahead of committee decisions |
| `ADMIN` | Full bank access; manages spreading templates, users, and bank-wide settings |

All data is isolated per-bank via a `bankId` scope enforced at the query layer — users only ever see deals belonging to their own institution.

## Cross-Repo Integration

Tickir Marketplace hands off an accepted borrower–lender match to this repo, which then takes over the underwriting lifecycle: collecting documents, spreading financials, and routing the deal through credit review to close. Each incoming match is provisioned as a `Deal` scoped to the receiving bank, and a borrower portal link is generated and emailed automatically so the borrower can begin uploading documents with no account creation required.

## Environment Variables

See `.env.example` for the full list. At minimum you'll need:

- `DATABASE_URL` — PostgreSQL connection string (Prisma)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — auth/session config
- `ANTHROPIC_API_KEY` — required for document validation and AI spreading
- Storage: either `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `AWS_S3_BUCKET`, **or** `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_BUCKET`
- Email: `SMTP_USER` / `SMTP_PASS` (Gmail SMTP) and/or `RESEND_API_KEY`
- `REDIS_URL` — background job queue (BullMQ)

## Deploy on Vercel

This project is deployed on Vercel with automatic production deploys on every push to `main`. The build command runs `prisma generate` before `next build` (see `vercel.json`). Make sure all required environment variables — especially storage credentials — are configured in the Vercel dashboard, since the local-disk upload fallback does not work in Vercel's serverless/read-only filesystem.
