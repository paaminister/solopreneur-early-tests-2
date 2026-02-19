import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createReceiptSchema } from "@/lib/validation/schemas";
import { withErrorHandling, validationError, checkIdempotency, storeIdempotency } from "@/lib/api-utils";
import { DEMO_USER_ID } from "@/lib/constants";

export async function GET() {
  return withErrorHandling(() => {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM receipts WHERE user_id = ? ORDER BY created_at DESC").all(DEMO_USER_ID);
    return NextResponse.json(rows);
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const parsed = createReceiptSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { filename, idempotency_key } = parsed.data;

    const existing = checkIdempotency(idempotency_key, "receipts");
    if (existing) return NextResponse.json(existing, { status: 200 });

    const db = getDb();
    const result = db.prepare("INSERT INTO receipts (user_id, filename) VALUES (?, ?)").run(DEMO_USER_ID, filename);
    const created = db.prepare("SELECT * FROM receipts WHERE id = ?").get(result.lastInsertRowid);

    storeIdempotency(idempotency_key, "receipts", created);
    return NextResponse.json(created, { status: 201 });
  });
}
