import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createTaxCardSchema } from "@/lib/validation/schemas";
import { withErrorHandling, validationError, checkIdempotency, storeIdempotency } from "@/lib/api-utils";
import { DEMO_USER_ID } from "@/lib/constants";

export async function GET() {
  return withErrorHandling(() => {
    const db = getDb();
    const cards = db.prepare("SELECT * FROM tax_card WHERE user_id = ? ORDER BY year DESC").all(DEMO_USER_ID);
    return NextResponse.json(cards);
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const parsed = createTaxCardSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { year, card_type, base_rate_pct, additional_rate_pct, income_limit_cents, in_ennakkoperintarekisteri, notes, idempotency_key } = parsed.data;

    const existing = checkIdempotency(idempotency_key, "tax_card");
    if (existing) return NextResponse.json(existing, { status: 200 });

    const db = getDb();
    const result = db
      .prepare("INSERT INTO tax_card (user_id, year, card_type, base_rate_pct, additional_rate_pct, income_limit_cents, in_ennakkoperintarekisteri, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(DEMO_USER_ID, year, card_type, base_rate_pct, additional_rate_pct ?? null, income_limit_cents ?? null, in_ennakkoperintarekisteri, notes ?? null);

    const created = db.prepare("SELECT * FROM tax_card WHERE id = ?").get(result.lastInsertRowid);

    storeIdempotency(idempotency_key, "tax_card", created);
    return NextResponse.json(created, { status: 201 });
  });
}
