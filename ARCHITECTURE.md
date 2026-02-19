# Lean MVP Architecture -- Local Demo Scaffold

## Context

We have a finalized architecture proposal (`Architecture Review & Technology Proposal.md`). Before committing to production infrastructure (Supabase, Enable Banking, Signicat, etc.), we need a **runnable local scaffold** that demonstrates the core architecture with demo/mock endpoints. This lets the team explore the codebase structure, test data flows, and validate the design before integrating real services.

## What We're Building

A Next.js project with:
- The actual folder structure and architecture patterns we'll use in production
- Demo API endpoints returning mock data for every core feature
- A minimal UI to interact with the endpoints
- SQLite (via better-sqlite3) as a zero-config local database standing in for Supabase/PostgreSQL
- No external service dependencies -- everything runs with `npm run dev`

## Project Structure

```
lkr-kirjanpito/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── .env.local.example
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with nav
│   │   ├── page.tsx                # Dashboard (income/expense YTD, tax estimate)
│   │   ├── transactions/
│   │   │   └── page.tsx            # Transaction list + add form
│   │   ├── receipts/
│   │   │   └── page.tsx            # Receipt upload + OCR results
│   │   ├── bank/
│   │   │   └── page.tsx            # Bank transactions + reconciliation
│   │   ├── settlements/
│   │   │   └── page.tsx            # Clinic settlement upload + parsed view
│   │   ├── tax/
│   │   │   └── page.tsx            # Tax estimator dashboard
│   │   └── api/
│   │       ├── transactions/
│   │       │   └── route.ts        # GET (list) + POST (create)
│   │       ├── receipts/
│   │       │   ├── route.ts        # GET (list) + POST (upload)
│   │       │   └── ocr/
│   │       │       └── route.ts    # POST (mock OCR extraction)
│   │       ├── banking/
│   │       │   ├── route.ts        # GET (bank transactions)
│   │       │   └── sync/
│   │       │       └── route.ts    # POST (mock bank sync)
│   │       ├── settlements/
│   │       │   ├── route.ts        # GET (list) + POST (upload)
│   │       │   └── parse/
│   │       │       └── route.ts    # POST (mock settlement PDF parse)
│   │       ├── tax/
│   │       │   ├── estimate/
│   │       │   │   └── route.ts    # GET (real tax calculation)
│   │       │   └── form5/
│   │       │       └── route.ts    # GET (Form 5 data export)
│   │       └── health/
│   │           └── route.ts        # GET (health check)
│   ├── lib/
│   │   ├── db.ts                   # SQLite setup + seed data
│   │   ├── tax/
│   │   │   ├── calculator.ts       # REAL 2026 Finnish tax brackets
│   │   │   ├── yel.ts              # REAL YEL calculation
│   │   │   └── form5.ts            # Form 5 field mapping
│   │   ├── categories.ts           # Doctor-specific expense categories
│   │   ├── settlements/
│   │   │   └── parser.ts           # Settlement parsing logic (mock)
│   │   └── validation/
│   │       └── hetu.ts             # HETU regex detector
│   └── components/
│       ├── DashboardCard.tsx
│       ├── TransactionForm.tsx
│       ├── TransactionList.tsx
│       ├── TaxGauge.tsx
│       └── Nav.tsx
```

## Demo API Endpoints

| Endpoint | Method | Description | Data |
|----------|--------|-------------|------|
| `/api/health` | GET | Health check | `{ status: "ok" }` |
| `/api/transactions` | GET | List all transactions | Returns from SQLite |
| `/api/transactions` | POST | Create transaction | Writes to SQLite |
| `/api/receipts` | GET | List uploaded receipts | Returns from SQLite |
| `/api/receipts` | POST | Upload receipt | Saves metadata to SQLite |
| `/api/receipts/ocr` | POST | Mock OCR extraction | Returns hardcoded `{ vendor, amount, date }` |
| `/api/banking` | GET | List bank transactions | Returns mock bank data from SQLite |
| `/api/banking/sync` | POST | Mock bank sync | Inserts mock transactions into SQLite |
| `/api/settlements` | GET | List settlements | Returns from SQLite |
| `/api/settlements` | POST | Upload settlement | Saves to SQLite |
| `/api/settlements/parse` | POST | Mock PDF parse | Returns hardcoded `{ gross, commission, net }` |
| `/api/tax/estimate` | GET | **Real** tax calculation | Computes from actual transaction data |
| `/api/tax/form5` | GET | Form 5 data export | Aggregates transactions into Form 5 fields |

## Real Logic (Not Mocked)

These modules contain actual business logic, not mock data:

1. **`lib/tax/calculator.ts`** -- 2026 Finnish progressive tax brackets, municipal tax, church tax, yrittajavahennys (5% entrepreneur deduction)
2. **`lib/tax/yel.ts`** -- YEL contribution calculation (24.4% rate, new entrepreneur discount, min/max)
3. **`lib/tax/form5.ts`** -- Maps transaction categories to Form 5 field numbers
4. **`lib/categories.ts`** -- Complete doctor-specific expense category list
5. **`lib/validation/hetu.ts`** -- Finnish HETU (social security number) regex detector

## Database (SQLite, Local Only)

Single file `lkr.db`, auto-created on first run. Tables mirror the production Supabase schema:

```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  receipt_id INTEGER,
  bank_ref TEXT,
  reconciled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  ocr_result TEXT,  -- JSON string
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE bank_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  description TEXT,
  counterpart TEXT,
  reference TEXT,
  matched_transaction_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic TEXT NOT NULL,
  period TEXT NOT NULL,
  gross_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  net_cents INTEGER NOT NULL,
  raw_parse TEXT,  -- JSON string
  created_at TEXT DEFAULT (datetime('now'))
);
```

Seeded with realistic demo data on first run (sample transactions, bank entries, a mock settlement).

## Minimal UI

Simple Tailwind pages -- not production design, just functional enough to test endpoints:

- **Dashboard** (`/`): Total income, total expenses, net profit, estimated tax, YEL contribution -- all computed live from SQLite data
- **Transactions** (`/transactions`): Table + form to add income/expense
- **Receipts** (`/receipts`): Upload button + mock OCR result display
- **Bank** (`/bank`): Mock bank transaction list + "Sync" button + reconciliation status
- **Settlements** (`/settlements`): Upload + mock parse result showing gross/commission/net
- **Tax** (`/tax`): Detailed tax breakdown with real 2026 brackets

## Files to Create

1. `lkr-kirjanpito/package.json` -- deps: next, react, tailwindcss, better-sqlite3, @types/better-sqlite3
2. `lkr-kirjanpito/tsconfig.json`
3. `lkr-kirjanpito/next.config.ts`
4. `lkr-kirjanpito/tailwind.config.ts`
5. `lkr-kirjanpito/src/lib/db.ts` -- SQLite init + seed
6. `lkr-kirjanpito/src/lib/tax/calculator.ts` -- real tax logic
7. `lkr-kirjanpito/src/lib/tax/yel.ts` -- real YEL logic
8. `lkr-kirjanpito/src/lib/tax/form5.ts` -- Form 5 mapping
9. `lkr-kirjanpito/src/lib/categories.ts` -- expense categories
10. `lkr-kirjanpito/src/lib/validation/hetu.ts` -- HETU regex
11. `lkr-kirjanpito/src/lib/settlements/parser.ts` -- mock parser
12. All API route files (12 routes)
13. All page files (6 pages)
14. All component files (5 components)
15. `lkr-kirjanpito/src/app/layout.tsx` -- root layout with nav

~35 files total.

## Verification

```bash
cd lkr-kirjanpito
npm install
npm run dev
# Visit http://localhost:3000
# Test: Add a transaction, see dashboard update, check tax estimate
# Test: Click "Sync Bank", see mock transactions appear
# Test: Upload receipt, see mock OCR result
# Test: Upload settlement, see gross/commission/net breakdown
# API tests:
curl http://localhost:3000/api/health
curl http://localhost:3000/api/transactions
curl -X POST http://localhost:3000/api/transactions -H 'Content-Type: application/json' -d '{"type":"income","date":"2026-01-15","amount_cents":750000,"category":"clinic_income","description":"Mehilainen January"}'
curl http://localhost:3000/api/tax/estimate
curl http://localhost:3000/api/tax/form5
```
