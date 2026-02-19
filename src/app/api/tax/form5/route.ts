import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateForm5 } from "@/lib/tax/form5";
import { withErrorHandling } from "@/lib/api-utils";
import { DEMO_USER_ID, CURRENT_FISCAL_YEAR } from "@/lib/constants";

export async function GET(request: NextRequest) {
  return withErrorHandling(() => {
    const fiscalYear = parseInt(request.nextUrl.searchParams.get("fiscal_year") || String(CURRENT_FISCAL_YEAR), 10);

    const db = getDb();
    const transactions = db
      .prepare("SELECT type, amount_cents, category, depreciation_years, depreciation_remaining_cents FROM transactions WHERE user_id = ? AND fiscal_year = ? AND deleted_at IS NULL")
      .all(DEMO_USER_ID, fiscalYear) as Array<{ type: string; amount_cents: number; category: string; depreciation_years: number | null; depreciation_remaining_cents: number | null }>;

    const form5 = generateForm5(transactions);

    return NextResponse.json({
      year: fiscalYear,
      form: "Form 5 - Elinkeinotoiminnan veroilmoitus",
      data: form5,
      note: "These values should be entered manually into OmaVero. Direct API submission (Apitamo) is planned for Phase 3.",
    });
  });
}
