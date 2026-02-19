import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withErrorHandling } from "@/lib/api-utils";
import { DEMO_USER_ID, CURRENT_FISCAL_YEAR } from "@/lib/constants";
import { getCategoryById } from "@/lib/categories";

export async function GET(request: NextRequest) {
  return withErrorHandling(() => {
    const fiscalYear = parseInt(request.nextUrl.searchParams.get("fiscal_year") || String(CURRENT_FISCAL_YEAR), 10);

    const db = getDb();

    const allTx = db
      .prepare("SELECT id, type, date, amount_cents, category, description, voucher_type FROM transactions WHERE user_id = ? AND fiscal_year = ? AND deleted_at IS NULL ORDER BY date DESC")
      .all(DEMO_USER_ID, fiscalYear) as Array<{ id: number; type: string; date: string; amount_cents: number; category: string; description: string | null; voucher_type: string }>;

    let withProof = 0;
    let proofNotRequired = 0;
    let missingProofCount = 0;
    const missingList: typeof allTx = [];
    const depreciationWarnings: Array<{ id: number; category: string; amount_cents: number; description: string | null }> = [];

    for (const tx of allTx) {
      const cat = getCategoryById(tx.category);
      const hasProof = tx.voucher_type !== "none";
      const needsProof = cat?.requiresProof !== false;

      if (hasProof) {
        withProof++;
      } else if (!needsProof) {
        proofNotRequired++;
      } else {
        missingProofCount++;
        missingList.push(tx);
      }

      // Depreciation warning for depreciable items > EUR 1,200
      if (cat?.depreciable && tx.amount_cents > 120000) {
        depreciationWarnings.push({ id: tx.id, category: tx.category, amount_cents: tx.amount_cents, description: tx.description });
      }
    }

    const byVoucherType = db
      .prepare("SELECT voucher_type, COUNT(*) as count FROM transactions WHERE user_id = ? AND fiscal_year = ? AND deleted_at IS NULL GROUP BY voucher_type")
      .all(DEMO_USER_ID, fiscalYear) as Array<{ voucher_type: string; count: number }>;

    const taxCard = db
      .prepare("SELECT * FROM tax_card WHERE user_id = ? ORDER BY year DESC LIMIT 1")
      .get(DEMO_USER_ID) as { in_ennakkoperintarekisteri: number; year: number } | undefined;

    return NextResponse.json({
      fiscal_year: fiscalYear,
      tositeStatus: {
        totalTransactions: allTx.length,
        withProof,
        proofNotRequired,
        missingProof: missingProofCount,
        complianceRate: allTx.length > 0 ? Math.round(((withProof + proofNotRequired) / allTx.length) * 100) : 100,
        byVoucherType,
        missingList,
      },
      depreciationWarnings,
      ennakkoperintarekisteri: {
        registered: taxCard?.in_ennakkoperintarekisteri === 1,
        year: taxCard?.year || null,
        warning: taxCard?.in_ennakkoperintarekisteri !== 1
          ? "Et ole ennakkoperintarekisterissa. Klinikkasi pidattavat lahdeveron suoraan tilityspalkkioistasi."
          : null,
      },
    });
  });
}
