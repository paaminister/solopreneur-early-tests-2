import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createTransactionSchema, paginationSchema } from "@/lib/validation/schemas";
import { withErrorHandling, validationError, checkIdempotency, storeIdempotency } from "@/lib/api-utils";
import { DEMO_USER_ID, CURRENT_FISCAL_YEAR } from "@/lib/constants";
import { getCategoryById } from "@/lib/categories";

export async function GET(request: NextRequest) {
  return withErrorHandling(() => {
    const params = request.nextUrl.searchParams;
    const parsed = paginationSchema.safeParse({
      limit: params.get("limit") ?? undefined,
      offset: params.get("offset") ?? undefined,
      fiscal_year: params.get("fiscal_year") ?? undefined,
    });

    if (!parsed.success) return validationError(parsed.error);
    const { limit, offset, fiscal_year } = parsed.data;

    const db = getDb();
    const fy = fiscal_year || CURRENT_FISCAL_YEAR;

    const rows = db
      .prepare(
        "SELECT * FROM transactions WHERE user_id = ? AND fiscal_year = ? AND deleted_at IS NULL ORDER BY date DESC LIMIT ? OFFSET ?"
      )
      .all(DEMO_USER_ID, fy, limit, offset);

    const total = db
      .prepare(
        "SELECT COUNT(*) as c FROM transactions WHERE user_id = ? AND fiscal_year = ? AND deleted_at IS NULL"
      )
      .get(DEMO_USER_ID, fy) as { c: number };

    return NextResponse.json({ data: rows, total: total.c, limit, offset, fiscal_year: fy });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) return validationError(parsed.error);
    const { type, date, amount_cents, category, description, voucher_type, idempotency_key } = parsed.data;

    // Idempotency check
    const existing = checkIdempotency(idempotency_key, "transactions");
    if (existing) return NextResponse.json(existing, { status: 200 });

    const fiscal_year = parseInt(date.substring(0, 4), 10);

    // Depreciation check for equipment > EUR 1,200
    const cat = getCategoryById(category);
    let depreciation_years: number | null = null;
    let depreciation_remaining_cents: number | null = null;
    if (cat?.depreciable && amount_cents > 120000) {
      depreciation_years = 3;
      depreciation_remaining_cents = Math.round(amount_cents * 0.75);
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO transactions (user_id, type, date, fiscal_year, amount_cents, category, description, voucher_type, depreciation_years, depreciation_remaining_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(DEMO_USER_ID, type, date, fiscal_year, amount_cents, category, description || null, voucher_type, depreciation_years, depreciation_remaining_cents);

    const created = db.prepare("SELECT * FROM transactions WHERE id = ?").get(result.lastInsertRowid);

    storeIdempotency(idempotency_key, "transactions", created);
    return NextResponse.json(created, { status: 201 });
  });
}
