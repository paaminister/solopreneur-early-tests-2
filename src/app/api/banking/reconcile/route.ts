import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { findMatches, type BankTx, type ManualTx } from "@/lib/reconciliation";
import { withErrorHandling } from "@/lib/api-utils";
import { DEMO_USER_ID } from "@/lib/constants";

export async function GET() {
  return withErrorHandling(() => {
    const db = getDb();

    const bankTxs = db
      .prepare("SELECT * FROM bank_transactions WHERE user_id = ? ORDER BY date DESC")
      .all(DEMO_USER_ID) as BankTx[];

    const manualTxs = db
      .prepare("SELECT id, type, date, amount_cents, description, bank_ref, reconciled FROM transactions WHERE user_id = ? AND deleted_at IS NULL")
      .all(DEMO_USER_ID) as ManualTx[];

    const matches = findMatches(bankTxs, manualTxs);

    return NextResponse.json({
      suggestedMatches: matches,
      unmatchedBankTransactions: bankTxs.filter((b) => !b.matched_transaction_id && !matches.some((m) => m.bankTxId === b.id)).length,
      unreconciledTransactions: manualTxs.filter((m) => !m.reconciled && !matches.some((mt) => mt.transactionId === m.id)).length,
    });
  });
}

export async function POST() {
  return withErrorHandling(() => {
    const db = getDb();

    const bankTxs = db
      .prepare("SELECT * FROM bank_transactions WHERE user_id = ? ORDER BY date DESC")
      .all(DEMO_USER_ID) as BankTx[];

    const manualTxs = db
      .prepare("SELECT id, type, date, amount_cents, description, bank_ref, reconciled FROM transactions WHERE user_id = ? AND deleted_at IS NULL")
      .all(DEMO_USER_ID) as ManualTx[];

    const matches = findMatches(bankTxs, manualTxs);

    const applyMatches = db.transaction(() => {
      for (const match of matches) {
        db.prepare("UPDATE bank_transactions SET matched_transaction_id = ? WHERE id = ?")
          .run(match.transactionId, match.bankTxId);
        db.prepare("UPDATE transactions SET reconciled = 1, voucher_type = CASE WHEN voucher_type = 'none' THEN 'bank_statement' ELSE voucher_type END WHERE id = ?")
          .run(match.transactionId);
      }
    });

    applyMatches();

    return NextResponse.json({
      matched: matches.length,
      details: matches,
    });
  });
}
