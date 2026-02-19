# LKR Kirjanpito

Finnish solo doctor (ammatinharjoittaja) accounting SaaS — MVP scaffold.

Built for the ~8,000 toiminimi doctors in Finland who work as independent contractors through clinic chains (Terveystalo, Mehilainen, Pihlajalinna).

## What this is

A working local scaffold that demonstrates every core feature with real Finnish tax logic, mock integrations, and a full UI. No external service dependencies — runs entirely on SQLite.

**Key domain features:**
- Real 2026 Finnish progressive income tax brackets
- YEL pension insurance calculation (24.4% base rate, new entrepreneur discount)
- Verokortti (tax card) tracking with withholding rate vs. actual rate comparison
- Ennakkovero (prepayment tax) schedule monitoring with under/overpayment alerts
- Form 5 (Elinkeinotoiminnan veroilmoitus) generation with depreciation
- 25% reducing balance depreciation for assets > EUR 1,200 (EVL §30-34)
- Clinic settlement parsing (mock) with automatic transaction linkage
- Tosite (voucher/proof) compliance per Kirjanpitolaki
- Bank reconciliation matching algorithm
- HETU (Finnish SSN) detection and validation

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Language | TypeScript (strict) |
| Database | SQLite via better-sqlite3 |
| Validation | Zod v4 |
| Testing | Vitest |

Production path: SQLite → Supabase PostgreSQL, Vercel hosting, Enable Banking PSD2 API.

## Quick start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
open http://localhost:3000
```

The database is auto-created with seed data on first request.

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard (fiscal year overview)
│   ├── transactions/page.tsx       # Transaction list + form
│   ├── tax/page.tsx                # Tax estimator + verokortti + ennakkovero
│   ├── bank/page.tsx               # Bank transactions (PSD2 mock)
│   ├── settlements/page.tsx        # Clinic settlement parser
│   ├── receipts/page.tsx           # Receipt/OCR management
│   └── api/
│       ├── transactions/           # CRUD with pagination, fiscal year scoping
│       ├── tax/
│       │   ├── estimate/           # Progressive tax calculation
│       │   ├── form5/              # Form 5 with depreciation
│       │   ├── card/               # Verokortti management
│       │   └── ennakkovero/        # Prepayment schedule + comparison
│       ├── banking/
│       │   ├── sync/               # PSD2 bank sync (mock)
│       │   └── reconcile/          # Matching algorithm
│       ├── settlements/
│       │   └── parse/              # PDF parser (mock)
│       ├── compliance/             # Tosite compliance check
│       ├── receipts/ocr/           # OCR extraction (mock)
│       └── health/                 # Health check
├── components/                     # React UI components
└── lib/
    ├── db.ts                       # SQLite schema + seed data
    ├── categories.ts               # Doctor-specific expense categories
    ├── constants.ts                # App-wide constants (currency, fiscal year)
    ├── api-utils.ts                # Error handling, idempotency
    ├── reconciliation.ts           # Bank matching algorithm
    ├── tax/
    │   ├── calculator.ts           # 2026 Finnish tax brackets
    │   ├── yel.ts                  # YEL pension calculation
    │   ├── ennakkovero.ts          # Prepayment comparison logic
    │   ├── form5.ts                # Form 5 field mapping + depreciation
    │   └── __tests__/              # 39 unit tests
    ├── validation/
    │   ├── schemas.ts              # Zod schemas for all API inputs
    │   └── hetu.ts                 # Finnish SSN validator
    └── settlements/
        └── parser.ts               # Settlement PDF parser (mock)
```

## API endpoints

All endpoints include Zod validation, structured error handling, user_id scoping, and fiscal year filtering.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | Paginated list `{ data, total, limit, offset, fiscal_year }` |
| POST | `/api/transactions` | Create transaction (auto-depreciation for laitteet > EUR 1,200) |
| GET | `/api/tax/estimate` | Full tax calculation with YEL and yrittajavahennys |
| GET | `/api/tax/form5` | Form 5 data with depreciation breakdown |
| GET/POST | `/api/tax/card` | Verokortti management |
| GET/POST | `/api/tax/ennakkovero` | Prepayment schedule + verokortti comparison |
| GET | `/api/banking` | Bank transactions |
| POST | `/api/banking/sync` | Sync bank (mock PSD2) |
| GET/POST | `/api/banking/reconcile` | Auto-match suggestions and apply matches |
| GET/POST | `/api/settlements` | Settlement history + create with linked transactions |
| POST | `/api/settlements/parse` | Parse settlement PDF (mock) |
| GET/POST | `/api/receipts` | Receipt management |
| POST | `/api/receipts/ocr` | OCR extraction (mock) |
| GET | `/api/compliance` | Tosite compliance with requiresProof distinction |
| GET | `/api/health` | Health check |

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

39 tests across 4 test suites covering tax calculator, YEL pension, ennakkovero comparison, and Form 5 depreciation.

## Architecture decisions

- **Single-entry bookkeeping** — Finnish ammatinharjoittaja doctors use single-entry, not double-entry
- **ALV 0%** — Healthcare services are VAT-exempt, so no VAT handling needed
- **Cents everywhere** — All monetary values stored as integers (cents) to avoid floating-point issues
- **Fiscal year = calendar year** — Finnish tax year aligns with calendar year
- **Idempotency keys** — All POST endpoints support idempotency to prevent duplicate creation
- **Category-level proof requirements** — `tyohuonevahennys` (home office deduction) doesn't need a receipt; everything else does
- **25% reducing balance depreciation** — Assets > EUR 1,200 depreciated per EVL §30-34

## License

Private — not for distribution.
