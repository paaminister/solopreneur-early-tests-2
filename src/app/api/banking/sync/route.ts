import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withErrorHandling } from "@/lib/api-utils";
import { DEMO_USER_ID } from "@/lib/constants";

export async function POST() {
  return withErrorHandling(() => {
    const db = getDb();
    const now = new Date().toISOString().split("T")[0];

    const insert = db.prepare(
      "INSERT INTO bank_transactions (user_id, date, amount_cents, description, counterpart, reference) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const syncBatch = db.transaction(() => {
      insert.run(DEMO_USER_ID, now, 350000, "MEHILAINEN OY LISATILITYS", "Mehilainen Oy", `RF-SYNC-${Date.now()}`);
      insert.run(DEMO_USER_ID, now, -2500, "RESEPTILEHTI TILAUS", "Kustannus Oy Duodecim", null);
    });

    syncBatch();

    const count = db.prepare("SELECT COUNT(*) as c FROM bank_transactions WHERE user_id = ?").get(DEMO_USER_ID) as { c: number };

    return NextResponse.json({
      message: "Bank sync completed (mock)",
      newTransactions: 2,
      totalTransactions: count.c,
      syncedAt: new Date().toISOString(),
    });
  });
}
