/**
 * Bank reconciliation matching algorithm.
 *
 * Matches bank transactions to manual transactions by:
 * 1. Exact amount match
 * 2. Date within ±3 days
 * 3. Fuzzy description similarity (optional bonus)
 */

export interface BankTx {
  id: number;
  date: string;
  amount_cents: number;
  description: string | null;
  counterpart: string | null;
  reference: string | null;
  matched_transaction_id: number | null;
}

export interface ManualTx {
  id: number;
  type: string;
  date: string;
  amount_cents: number;
  description: string | null;
  bank_ref: string | null;
  reconciled: number;
}

export interface MatchCandidate {
  bankTxId: number;
  transactionId: number;
  score: number;
  reasons: string[];
}

/**
 * Find potential matches between unmatched bank transactions and unreconciled manual transactions.
 */
export function findMatches(
  bankTxs: BankTx[],
  manualTxs: ManualTx[]
): MatchCandidate[] {
  const candidates: MatchCandidate[] = [];

  const unmatchedBank = bankTxs.filter((b) => !b.matched_transaction_id);
  const unreconciledManual = manualTxs.filter((m) => !m.reconciled);

  for (const bank of unmatchedBank) {
    // Bank amounts are negative for expenses, positive for income
    const bankAmountAbs = Math.abs(bank.amount_cents);
    const bankIsExpense = bank.amount_cents < 0;

    for (const manual of unreconciledManual) {
      const reasons: string[] = [];
      let score = 0;

      // 1. Exact amount match (required)
      const manualAmount = manual.amount_cents;
      if (bankAmountAbs !== manualAmount) continue;

      // Type must match: negative bank = expense, positive = income
      if (bankIsExpense && manual.type !== "expense") continue;
      if (!bankIsExpense && manual.type !== "income") continue;

      score += 50;
      reasons.push("Exact amount match");

      // 2. Date proximity (within ±3 days)
      const bankDate = new Date(bank.date);
      const manualDate = new Date(manual.date);
      const daysDiff = Math.abs(
        (bankDate.getTime() - manualDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 0) {
        score += 30;
        reasons.push("Same date");
      } else if (daysDiff <= 1) {
        score += 25;
        reasons.push("Date within 1 day");
      } else if (daysDiff <= 3) {
        score += 15;
        reasons.push(`Date within ${Math.round(daysDiff)} days`);
      } else if (daysDiff <= 7) {
        score += 5;
        reasons.push(`Date within ${Math.round(daysDiff)} days`);
      } else {
        continue; // Too far apart
      }

      // 3. Reference match (bonus)
      if (bank.reference && manual.bank_ref && bank.reference === manual.bank_ref) {
        score += 20;
        reasons.push("Reference match");
      }

      // 4. Description similarity (simple keyword overlap)
      if (bank.description && manual.description) {
        const bankWords = bank.description.toLowerCase().split(/\s+/);
        const manualWords = manual.description.toLowerCase().split(/\s+/);
        const overlap = bankWords.filter((w) => manualWords.some((mw) => mw.includes(w) || w.includes(mw)));
        if (overlap.length > 0) {
          score += Math.min(10, overlap.length * 3);
          reasons.push(`Description overlap: ${overlap.join(", ")}`);
        }
      }

      if (score >= 50) {
        candidates.push({
          bankTxId: bank.id,
          transactionId: manual.id,
          score,
          reasons,
        });
      }
    }
  }

  // Sort by score descending, then deduplicate (each bank tx and manual tx matched at most once)
  candidates.sort((a, b) => b.score - a.score);

  const usedBank = new Set<number>();
  const usedManual = new Set<number>();
  const bestMatches: MatchCandidate[] = [];

  for (const c of candidates) {
    if (!usedBank.has(c.bankTxId) && !usedManual.has(c.transactionId)) {
      bestMatches.push(c);
      usedBank.add(c.bankTxId);
      usedManual.add(c.transactionId);
    }
  }

  return bestMatches;
}
