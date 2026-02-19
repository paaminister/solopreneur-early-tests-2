import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSettlementSchema } from "@/lib/validation/schemas";
import { withErrorHandling, validationError, checkIdempotency, storeIdempotency } from "@/lib/api-utils";
import { DEMO_USER_ID } from "@/lib/constants";

export async function GET() {
  return withErrorHandling(() => {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM settlements WHERE user_id = ? ORDER BY period DESC").all(DEMO_USER_ID);
    return NextResponse.json(rows);
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const parsed = createSettlementSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { clinic, period, gross_cents, commission_cents, net_cents, idempotency_key } = parsed.data;

    const existing = checkIdempotency(idempotency_key, "settlements");
    if (existing) return NextResponse.json(existing, { status: 200 });

    const db = getDb();
    const fiscal_year = parseInt(period.substring(0, 4), 10);

    // Create settlement and linked transactions in a single transaction
    const createAll = db.transaction(() => {
      const settlementResult = db
        .prepare("INSERT INTO settlements (user_id, clinic, period, gross_cents, commission_cents, net_cents) VALUES (?, ?, ?, ?, ?, ?)")
        .run(DEMO_USER_ID, clinic, period, gross_cents, commission_cents, net_cents);

      const settlementId = Number(settlementResult.lastInsertRowid);
      const periodEnd = period + "-28"; // Approximate

      // Create linked income transaction (net deposit)
      db.prepare(
        "INSERT INTO transactions (user_id, type, date, fiscal_year, amount_cents, category, description, voucher_type, settlement_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(DEMO_USER_ID, "income", periodEnd, fiscal_year, net_cents, "clinic_income", `${clinic} tilitys ${period} (net)`, "settlement", settlementId);

      // Create linked expense transaction (commission)
      db.prepare(
        "INSERT INTO transactions (user_id, type, date, fiscal_year, amount_cents, category, description, voucher_type, settlement_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(DEMO_USER_ID, "expense", periodEnd, fiscal_year, commission_cents, "muut_kulut", `${clinic} provisio ${period}`, "settlement", settlementId);

      return db.prepare("SELECT * FROM settlements WHERE id = ?").get(settlementId);
    });

    const created = createAll();

    storeIdempotency(idempotency_key, "settlements", created);
    return NextResponse.json(created, { status: 201 });
  });
}
