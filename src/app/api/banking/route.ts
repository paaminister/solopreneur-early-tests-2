import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withErrorHandling } from "@/lib/api-utils";
import { DEMO_USER_ID } from "@/lib/constants";

export async function GET() {
  return withErrorHandling(() => {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM bank_transactions WHERE user_id = ? ORDER BY date DESC").all(DEMO_USER_ID);
    return NextResponse.json(rows);
  });
}
